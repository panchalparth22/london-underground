require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const TFL_BASE = 'https://api.tfl.gov.uk';
const APP_KEY = process.env.TFL_API_KEY;
const PORT = process.env.PORT || 5000;

const tfl = axios.create({
  baseURL: TFL_BASE,
  timeout: 8000,
  params: { app_key: APP_KEY },
});

const lineSequenceCache = new Map();

const LINE_ID_MAP = {
  'dlr': 'dlr', 'jubilee': 'jubilee', 'central': 'central',
  'district': 'district', 'circle': 'circle',
  'hammersmith & city': 'hammersmith-city', 'hammersmith and city': 'hammersmith-city',
  'metropolitan': 'metropolitan', 'northern': 'northern',
  'piccadilly': 'piccadilly', 'victoria': 'victoria', 'bakerloo': 'bakerloo',
  'waterloo & city': 'waterloo-city', 'waterloo and city': 'waterloo-city',
  'elizabeth': 'elizabeth', 'elizabeth line': 'elizabeth',
  'overground': 'london-overground', 'london overground': 'london-overground',
};

function resolveLineId(lineName) {
  if (!lineName) return null;
  const key = lineName.toLowerCase().trim();
  return LINE_ID_MAP[key] || key.replace(/\s+/g, '-');
}

function cleanLineName(raw) {
  if (!raw) return raw;
  const lower = raw.toLowerCase().trim();
  if (lower === 'elizabeth line') return 'Elizabeth';
  if (lower === 'london overground') return 'Overground';
  return raw;
}

function norm(s) {
  return (s || '').toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/ underground station/i, '')
    .replace(/ dlr station/i, '')
    .replace(/ elizabeth line station/i, '')
    .replace(/ overground station/i, '')
    .replace(/ rail station/i, '')
    .replace(/ tram stop/i, '')
    .replace(/ bus stop/i, '')
    .replace(/ station/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Sequence Fetcher ─────────────────────────────────────────────────────────
async function fetchSequences(lineId) {
  if (lineSequenceCache.has(lineId)) return lineSequenceCache.get(lineId);
  try {
    const [outRes, inRes] = await Promise.all([
      tfl.get(`/Line/${encodeURIComponent(lineId)}/Route/Sequence/outbound`, { timeout: 5000 }),
      tfl.get(`/Line/${encodeURIComponent(lineId)}/Route/Sequence/inbound`, { timeout: 5000 }),
    ]);
    const sequences = [];
    for (const res of [outRes, inRes]) {
      for (const seq of (res.data.stopPointSequences || [])) {
        const stops = (seq.stopPoint || []).map(s => ({ name: s.name }));
        if (stops.length > 1) sequences.push(stops);
      }
    }
    lineSequenceCache.set(lineId, sequences);
    return sequences;
  } catch {
    lineSequenceCache.set(lineId, []);
    return [];
  }
}

// ─── Allowed modes only ───────────────────────────────────────────────────────
const SKIP_MODES = ['walking', 'bus', 'replacement-bus', 'coach', 'cable-car', 'cycle', 'tram'];
const ALLOWED_MODES = ['tube', 'dlr', 'elizabeth-line', 'overground'];
const BANNED_MODES  = ['bus', 'replacement-bus', 'coach', 'national-rail', 'tram', 'cable-car', 'ferry'];

// ─── Pre-fetch sequences ──────────────────────────────────────────────────────
async function prefetchSequences(journeys) {
  const lineIds = new Set();
  for (const j of journeys) {
    for (const leg of j.legs) {
      if (!SKIP_MODES.includes(leg.mode?.name)) {
        const id = resolveLineId(cleanLineName(leg.routeOptions?.[0]?.name) || leg.mode?.name);
        if (id && !lineSequenceCache.has(id)) lineIds.add(id);
      }
    }
  }
  await Promise.all([...lineIds].map(id => fetchSequences(id)));
}

// ─── Stop Resolver ────────────────────────────────────────────────────────────
function getStopsFromCache(lineName, fromName, toName) {
  const lineId = resolveLineId(lineName);
  if (!lineId) return null;
  const sequences = lineSequenceCache.get(lineId) || [];
  const normFrom = norm(fromName);
  const normTo = norm(toName);

  const findIdx = (seq, target) => {
    let i = seq.findIndex(s => norm(s.name) === target);
    if (i !== -1) return i;
    i = seq.findIndex(s => { const n = norm(s.name); return n.startsWith(target) || target.startsWith(n); });
    if (i !== -1) return i;
    i = seq.findIndex(s => { const n = norm(s.name); return n.includes(target) || target.includes(n); });
    return i;
  };

  for (const seq of sequences) {
    const fi = findIdx(seq, normFrom);
    const ti = findIdx(seq, normTo);
    if (fi === -1 || ti === -1) continue;
    const start = Math.min(fi, ti), end = Math.max(fi, ti);
    let slice = seq.slice(start, end + 1).map(s => s.name);
    if (fi > ti) slice.reverse();
    return slice;
  }

  // One-hop stitch
  for (const seqA of sequences) {
    const fi = findIdx(seqA, normFrom);
    if (fi === -1) continue;
    for (const seqB of sequences) {
      if (seqB === seqA) continue;
      const ti = findIdx(seqB, normTo);
      if (ti === -1) continue;
      const setB = new Set(seqB.map(s => norm(s.name)));
      const junctionIdx = seqA.findIndex((s, i) => i >= fi && setB.has(norm(s.name)));
      if (junctionIdx === -1) continue;
      const junction = norm(seqA[junctionIdx].name);
      const ji = seqB.findIndex(s => norm(s.name) === junction);
      if (ji === -1) continue;
      const partA = seqA.slice(fi, junctionIdx + 1).map(s => s.name);
      const partB = seqB.slice(Math.min(ji, ti), Math.max(ji, ti) + 1).map(s => s.name);
      if (ji > ti) partB.reverse();
      const full = [...partA.slice(0, -1), ...partB];
      if (full.length >= 2) return full;
    }
  }
  return null;
}

// ─── Merge same-train legs ────────────────────────────────────────────────────
function mergeLegs(legs) {
  const merged = [];
  for (const leg of legs) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.mode === leg.mode &&
      prev.lineName === leg.lineName &&
      norm(prev.to) === norm(leg.from)
    ) {
      const gapMins = (new Date(leg.departureTime) - new Date(prev.arrivalTime)) / 60000;
      if (gapMins <= 1) {
        const combinedStops = [
          ...(prev.stops?.length ? prev.stops : [prev.from]),
          ...(leg.stops?.length >= 2 ? leg.stops.slice(1) : [leg.to]),
        ];
        const seen = new Set();
        prev.stops = combinedStops.filter(s => {
          const k = norm(s);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        prev.to = leg.to;
        prev.arrivalTime = leg.arrivalTime;
        prev.duration = (prev.duration || 0) + (leg.duration || 0);
        prev.instruction = leg.instruction || prev.instruction;
        continue;
      }
    }
    merged.push({ ...leg });
  }
  return merged;
}

// ─── Leg Enricher ─────────────────────────────────────────────────────────────
async function enrichLeg(leg) {
  const mode = leg.mode?.name;
  const from = leg.departurePoint?.commonName;
  const to = leg.arrivalPoint?.commonName;
  const lineName = cleanLineName(leg.routeOptions?.[0]?.name || mode);

  if (SKIP_MODES.includes(mode)) {
    return {
      mode, lineName, from, to,
      duration: leg.duration,
      departureTime: leg.departureTime,
      arrivalTime: leg.arrivalTime,
      instruction: leg.instruction?.summary,
      stops: [],
    };
  }

  let stops = [];
  if (leg.path?.stopList?.length >= 2) stops = leg.path.stopList.map(s => s.name);
  if (stops.length < 2) stops = getStopsFromCache(lineName, from, to) || [];
  if (stops.length < 2) stops = getStopsFromCache(leg.routeOptions?.[0]?.name, from, to) || [];
  if (stops.length < 2) stops = getStopsFromCache(mode, from, to) || [];
  if (stops.length < 2) stops = [from, to];

  const seen = new Set();
  const deduped = stops.filter(s => {
    const k = norm(s);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const final = [...deduped];
  if (!final.length || norm(final[0]) !== norm(from)) final.unshift(from);
  if (norm(final[final.length - 1]) !== norm(to)) final.push(to);

  return {
    mode, lineName, from, to,
    duration: leg.duration,
    departureTime: leg.departureTime,
    arrivalTime: leg.arrivalTime,
    instruction: leg.instruction?.summary,
    stops: final,
  };
}

// ─── Journey Fetcher ──────────────────────────────────────────────────────────
async function getJourneys(fromId, toId) {
  try {
    const res = await tfl.get(
      `/Journey/JourneyResults/${encodeURIComponent(fromId)}/to/${encodeURIComponent(toId)}`,
      { params: { nationalSearch: false } }
    );
    return res.data.journeys || [];
  } catch { return []; }
}

function buildRouteKey(j) {
  return j.legs.map(l => `${l.mode?.name}:${l.routeOptions?.[0]?.name || ''}`).join('|');
}

// ─── /api/journey ─────────────────────────────────────────────────────────────
app.get('/api/journey', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });

  const t = label => console.log(`[${new Date().toISOString()}] ${label}`);

  try {
    t(`START → ${from} to ${to}`);

    const [fromSearch, toSearch] = await Promise.all([
      tfl.get(`/StopPoint/Search/${encodeURIComponent(from)}`, { params: { modes: 'tube,dlr,elizabeth-line,overground' } }),
      tfl.get(`/StopPoint/Search/${encodeURIComponent(to)}`, { params: { modes: 'tube,dlr,elizabeth-line,overground' } }),
    ]);

    const fromMatch = fromSearch.data.matches?.[0];
    const toMatch   = toSearch.data.matches?.[0];
    if (!fromMatch || !toMatch) return res.status(404).json({ error: 'Station not found' });

    async function getRailIds(match) {
      if (!match.id.startsWith('HUB')) return [match.id];
      const hubRes = await tfl.get(`/StopPoint/${match.id}`);
      const ids = [];
      const addChild = c => {
        const id = c.naptanId || c.id;
        if (id && (id.startsWith('940G') || id.startsWith('910G')) &&
          c.modes?.some(m => ALLOWED_MODES.includes(m))) ids.push(id);
      };
      for (const child of (hubRes.data.children || [])) {
        addChild(child);
        for (const gc of (child.children || [])) addChild(gc);
      }
      return ids.length ? [...new Set(ids)] : [match.id];
    }

    const [fromIds, toIds] = await Promise.all([getRailIds(fromMatch), getRailIds(toMatch)]);
    t(`IDS → from:[${fromIds}] to:[${toIds}]`);

    if (!fromIds.length || !toIds.length)
      return res.status(404).json({ error: 'Station not found' });

    const pickBest = ids =>
      ids.find(id => id.startsWith('940GZZLU')) ||
      ids.find(id => id.startsWith('940GZZD'))  ||
      ids.find(id => id.startsWith('910G'))      ||
      ids[0];

    const fromTube = fromIds.find(id => id.startsWith('940GZZLU'));
    const fromDlr  = fromIds.find(id => id.startsWith('940GZZD'));
    const fromEliz = fromIds.find(id => id.startsWith('910G'));
    const fromBest = pickBest(fromIds);

    const toTube   = toIds.find(id => id.startsWith('940GZZLU'));
    const toDlr    = toIds.find(id => id.startsWith('940GZZD'));
    const toEliz   = toIds.find(id => id.startsWith('910G'));
    const toBest   = pickBest(toIds);

    t(`BEST → from:${fromBest} to:${toBest}`);

    const pairSet = new Set();
    if (fromTube && toTube) pairSet.add(`${fromTube}|${toTube}`);
    if (fromDlr  && toDlr)  pairSet.add(`${fromDlr}|${toDlr}`);
    if (fromEliz && toEliz) pairSet.add(`${fromEliz}|${toEliz}`);
    if (fromTube && toDlr)  pairSet.add(`${fromTube}|${toDlr}`);
    if (fromDlr  && toTube) pairSet.add(`${fromDlr}|${toTube}`);
    if (fromTube && toEliz) pairSet.add(`${fromTube}|${toEliz}`);
    if (fromDlr  && toEliz) pairSet.add(`${fromDlr}|${toEliz}`);
    if (fromEliz && toTube) pairSet.add(`${fromEliz}|${toTube}`);
    if (fromEliz && toDlr)  pairSet.add(`${fromEliz}|${toDlr}`);
    pairSet.add(`${fromBest}|${toBest}`);

    const pairs = [...pairSet].filter(p => {
      const [f, t2] = p.split('|');
      return f && t2 && f !== t2;
    });

    t(`QUERYING ${pairs.length} pairs`);
    const batches = await Promise.all(pairs.map(p => {
      const [f, t2] = p.split('|');
      return getJourneys(f, t2);
    }));

    const seenKeys = new Set();
    const allJourneys = [];
    for (const batch of batches) {
      for (const j of batch) {
        const key = buildRouteKey(j);
        if (!seenKeys.has(key)) { seenKeys.add(key); allJourneys.push(j); }
      }
    }
    t(`UNIQUE: ${allJourneys.length}`);

    if (!allJourneys.length) return res.status(404).json({ error: 'No journeys found' });

    await prefetchSequences(allJourneys);
    t('SEQUENCES CACHED');

    const routeMap = new Map();
    for (const j of allJourneys) {
      const key = buildRouteKey(j);
      if (!routeMap.has(key)) routeMap.set(key, []);
      routeMap.get(key).push(j);
    }
    t(`ROUTE GROUPS: ${routeMap.size}`);

    const routes = await Promise.all(
      [...routeMap.values()].slice(0, 6).map(async journeys => {
        const enriched = await Promise.all(
          journeys.slice(0, 3).map(async j => {
            const rawLegs = await Promise.all(j.legs.map(enrichLeg));
            const legs = mergeLegs(rawLegs);
            return {
              startDateTime: j.legs[0]?.departureTime,
              arrivalDateTime: j.legs[j.legs.length - 1]?.arrivalTime,
              totalDuration: j.duration,
              legs,
            };
          })
        );
        enriched.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
        const transport = enriched[0].legs.filter(l => l.mode !== 'walking');
        return {
          mode: transport[0]?.mode || 'unknown',
          lineName: transport[0]?.lineName || '',
          from, to,
          totalDuration: enriched[0].totalDuration,
          legs: transport,
          departures: enriched,
        };
      })
    );
    t('ENRICHMENT DONE');

    routes.sort((a, b) =>
      a.legs.length !== b.legs.length
        ? a.legs.length - b.legs.length
        : a.totalDuration - b.totalDuration
    );

    // ─── Filter + deduplicate ─────────────────────────────────────────────────
    const normDest = norm(to);
    const seen = new Set();
    const final = routes.filter(r => {
      const allLegs = r.departures?.[0]?.legs || [];
      const transportLegs = allLegs.filter(l => l.mode !== 'walking');

      // ✅ Drop routes containing bus/coach/national-rail legs
      const hasBanned = transportLegs.some(l => BANNED_MODES.includes(l.mode));
      if (hasBanned) {
        console.log(`  ❌ Filtered: contains banned mode`);
        return false;
      }

      // ✅ Last transport leg must end at destination
      const lastTransport = transportLegs[transportLegs.length - 1];
      const lastDest = norm(lastTransport?.to || '');
      const endsAtDest =
        lastDest === normDest ||
        lastDest.includes(normDest) ||
        normDest.includes(lastDest);

      if (!endsAtDest) {
        console.log(`  ❌ Filtered: ends at "${lastTransport?.to}"`);
        return false;
      }

      // ✅ Deduplicate by line signature
      const key = r.legs.map(l => `${l.mode}:${l.lineName}`).join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    t(`✅ DONE — ${final.length} routes`);
    res.json({ routes: final });

  } catch (e) {
    console.error('❌', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.listen(PORT, () => console.log(`🚇 Backend running on http://localhost:${PORT}`));
