import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

const LINE_COLORS = {
  jubilee: '#A0A5A9', central: '#E32017', northern: '#000000',
  piccadilly: '#003688', victoria: '#0098D4', bakerloo: '#B36305',
  metropolitan: '#9B0056', circle: '#FFD300', district: '#00782A',
  'hammersmith-city': '#F3A9BB', overground: '#EE7C0E',
  dlr: '#00A4A7', elizabeth: '#6950A1', default: '#555555',
};

function getColor(mode, lineName) {
  const l = (lineName || '').toLowerCase().replace(/[\s\-&]/g, '');
  const m = (mode || '').toLowerCase().replace(/[\s\-&]/g, '');
  return LINE_COLORS[l] || LINE_COLORS[m] || LINE_COLORS.default;
}

function formatTime(dt) {
  if (!dt) return '--:--';
  return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(mins) {
  if (!mins) return '';
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`;
}

function cleanName(name) {
  return (name || '')
    .replace(/ Underground Station/gi, '')
    .replace(/ DLR Station/gi, '')
    .replace(/ Elizabeth Line Station/gi, '')
    .replace(/ Overground Station/gi, '')
    .replace(/ Rail Station/gi, '')
    .replace(/ Station/gi, '');
}

function formatLineName(lineName) {
  if (!lineName) return '';
  const lower = lineName.toLowerCase();
  if (lower === 'dlr') return 'DLR';
  if (lower.includes('line')) return lineName;
  return `${lineName} line`;
}

// ─── Live Clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#00d4ff', fontWeight: 700, letterSpacing: 2 }}>
      {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </div>
  );
}

// ─── Animated Underground Logo ────────────────────────────────────────────────
function TubeLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="22" fill="#E32017" />
      <rect x="4" y="19" width="40" height="10" rx="5" fill="#003399" />
      <text x="24" y="27" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">UNDERGROUND</text>
    </svg>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────
function Pill({ mode, lineName, small }) {
  const color = getColor(mode, lineName);
  const label = lineName?.toLowerCase() === 'dlr' ? 'DLR' : lineName || mode || '';
  return (
    <span style={{
      background: color,
      color: color === LINE_COLORS.circle ? '#000' : '#fff',
      borderRadius: 20,
      padding: small ? '2px 10px' : '5px 14px',
      fontSize: small ? '0.68rem' : '0.78rem',
      fontWeight: 800,
      textTransform: lineName?.toLowerCase() === 'dlr' ? 'uppercase' : 'capitalize',
      whiteSpace: 'nowrap',
      letterSpacing: '0.5px',
      boxShadow: `0 2px 12px ${color}66`,
      border: `1px solid ${color}99`,
    }}>
      {label}
    </span>
  );
}

// ─── Station List ─────────────────────────────────────────────────────────────
function StationList({ leg }) {
  const color = getColor(leg.mode, leg.lineName);
  const stops = (leg.stops?.length >= 2) ? leg.stops : [leg.from, leg.to].filter(Boolean);
  const intermediateCount = Math.max(stops.length - 2, 0);

  return (
    <div style={{ margin: '8px 0' }}>
      {stops.map((station, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === stops.length - 1;
        const isTerminal = isFirst || isLast;
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'stretch', minHeight: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
              {!isFirst && (
                <div style={{
                  width: 2, height: 8,
                  background: `linear-gradient(to bottom, ${color}, ${color}44)`,
                }} />
              )}
              <div style={{
                width: isTerminal ? 14 : 8,
                height: isTerminal ? 14 : 8,
                borderRadius: '50%',
                background: isTerminal ? color : 'transparent',
                border: `2.5px solid ${color}`,
                boxShadow: isTerminal ? `0 0 10px ${color}88, 0 0 20px ${color}44` : 'none',
                transition: 'all 0.2s',
              }} />
              {!isLast && (
                <div style={{
                  width: 2, flex: 1, minHeight: 10,
                  background: `linear-gradient(to bottom, ${color}44, ${color})`,
                }} />
              )}
            </div>
            <div style={{ flex: 1, padding: '4px 0 4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: isTerminal ? '0.92rem' : '0.8rem',
                fontWeight: isTerminal ? 700 : 400,
                color: isTerminal ? '#e8f4ff' : '#6a8aaa',
                letterSpacing: isTerminal ? '0.3px' : '0',
              }}>
                {cleanName(station)}
              </span>
              {isFirst && (
                <span style={{
                  fontSize: '0.58rem', fontWeight: 900,
                  background: color, color: '#fff',
                  borderRadius: 4, padding: '2px 7px',
                  letterSpacing: '1px', boxShadow: `0 2px 8px ${color}66`,
                }}>
                  BOARD
                </span>
              )}
              {isLast && (
                <span style={{
                  fontSize: '0.58rem', fontWeight: 900,
                  background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                  color: '#00d4ff', border: '1px solid #00d4ff44',
                  borderRadius: 4, padding: '2px 7px', letterSpacing: '1px',
                }}>
                  EXIT
                </span>
              )}
            </div>
          </div>
        );
      })}

      {intermediateCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, marginLeft: 28 }}>
          <span style={{
            background: `${color}22`, color,
            borderRadius: 20, padding: '3px 12px',
            fontWeight: 800, fontSize: '0.72rem',
            border: `1px solid ${color}44`,
            boxShadow: `0 2px 8px ${color}22`,
          }}>
            {intermediateCount} stop{intermediateCount !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '0.73rem', color: '#4a6a8a' }}>on the {formatLineName(leg.lineName)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Departure Row ────────────────────────────────────────────────────────────
function DepartureRow({ dep, index }) {
  const [open, setOpen] = useState(false);
  const transportLegs = dep.legs.filter(l => l.mode !== 'walking');
  const changes = transportLegs.length - 1;
  const totalStops = dep.legs.reduce((acc, l) => {
    if (l.mode === 'walking') return acc;
    return acc + Math.max((l.stops?.length || 2) - 2, 0);
  }, 0);
  const summary = changes === 0
    ? (totalStops > 0 ? `${totalStops} stop${totalStops !== 1 ? 's' : ''}` : 'Direct')
    : `${changes} change${changes > 1 ? 's' : ''}${totalStops > 0 ? ` · ${totalStops} stops` : ''}`;

  return (
    <div style={{
      border: `1px solid ${open ? '#00d4ff44' : '#1a2a3a'}`,
      borderRadius: 10, marginBottom: 8, overflow: 'hidden',
      background: open ? 'rgba(0,212,255,0.03)' : 'transparent',
      transition: 'all 0.2s',
      boxShadow: open ? '0 4px 20px rgba(0,212,255,0.08)' : 'none',
    }}>
      <div onClick={() => setOpen(!open)} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.75rem 1rem', cursor: 'pointer',
        background: index === 0
          ? 'linear-gradient(90deg, rgba(0,212,255,0.08), rgba(0,100,160,0.05))'
          : 'transparent',
        borderBottom: open ? '1px solid #1a2a3a' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {index === 0 && (
            <span style={{
              background: 'linear-gradient(135deg, #00d4ff, #0088cc)',
              color: '#000', fontSize: '0.58rem', fontWeight: 900,
              borderRadius: 5, padding: '3px 8px', letterSpacing: '1.5px',
              boxShadow: '0 2px 10px rgba(0,212,255,0.4)',
            }}>
              NEXT
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#e8f4ff', fontFamily: 'monospace' }}>
              {formatTime(dep.startDateTime)}
            </span>
            <span style={{ color: '#1a3a5a', margin: '0 4px', fontSize: '0.8rem' }}>→</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#e8f4ff', fontFamily: 'monospace' }}>
              {formatTime(dep.arrivalDateTime)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#00d4ff' }}>
              {formatDuration(dep.totalDuration)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#2a4a6a', marginTop: 1 }}>{summary}</div>
          </div>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: open ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${open ? '#00d4ff44' : '#1a2a3a'}`,
            color: open ? '#00d4ff' : '#2a4a6a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.6rem', fontWeight: 800, transition: 'all 0.2s',
          }}>
            {open ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {open && (
        <div style={{ padding: '1rem 1.1rem', background: 'rgba(0,10,20,0.4)' }}>
          {dep.legs.map((leg, i) => (
            <div key={i}>
              {leg.mode === 'walking' ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 4px 6px 12px', color: '#2a4a6a', fontSize: '0.82rem',
                  borderLeft: '2px dashed #1a2a3a', marginLeft: 12, marginBottom: 8,
                }}>
                  🚶 Walk ~{leg.duration} min
                  {leg.instruction && <span style={{ color: '#1a3a5a' }}> — {leg.instruction}</span>}
                </div>
              ) : (
                <div style={{
                  background: 'rgba(0,20,40,0.6)',
                  border: `1px solid ${getColor(leg.mode, leg.lineName)}33`,
                  borderLeft: `3px solid ${getColor(leg.mode, leg.lineName)}`,
                  borderRadius: 8, padding: '0.9rem 1rem',
                  marginBottom: i < dep.legs.length - 1 ? 8 : 0,
                  backdropFilter: 'blur(10px)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Pill mode={leg.mode} lineName={leg.lineName} small />
                      <span style={{ fontSize: '0.78rem', color: '#4a6a8a', fontWeight: 600 }}>
                        {formatLineName(leg.lineName)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '0.75rem', color: '#4a7a9a',
                      background: 'rgba(0,212,255,0.05)',
                      borderRadius: 6, padding: '3px 10px',
                      border: '1px solid rgba(0,212,255,0.1)',
                      fontFamily: 'monospace',
                    }}>
                      {formatTime(leg.departureTime)}
                      <span style={{ color: '#1a3a5a', margin: '0 4px' }}>→</span>
                      {formatTime(leg.arrivalTime)}
                      <span style={{ color: '#2a4a6a', marginLeft: 6 }}>· {leg.duration}m</span>
                    </div>
                  </div>
                  <StationList leg={leg} />
                  {leg.instruction && (
                    <div style={{
                      marginTop: 8, fontSize: '0.75rem', color: '#2a4a6a',
                      background: 'rgba(0,212,255,0.03)',
                      borderRadius: 5, padding: '5px 10px',
                      borderLeft: '2px solid rgba(0,212,255,0.2)',
                    }}>
                      ℹ️ {leg.instruction}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div style={{
            marginTop: 10, padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, rgba(0,40,80,0.8), rgba(0,60,100,0.6))',
            borderRadius: 8,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '0.87rem', border: '1px solid rgba(0,212,255,0.15)',
          }}>
            <span style={{ color: '#8ab4cc' }}>🏁 Arrive <strong style={{ color: '#00d4ff' }}>{formatTime(dep.arrivalDateTime)}</strong></span>
            <span style={{ color: '#4a6a8a' }}>Total: <strong style={{ color: '#00d4ff' }}>{formatDuration(dep.totalDuration)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Route Card ───────────────────────────────────────────────────────────────
function RouteCard({ route, index }) {
  const [open, setOpen] = useState(false);
  const changes = route.legs.length - 1;
  const nextDep = route.departures?.[0];
  const color = getColor(route.mode, route.lineName);

  return (
    <div style={{
      borderRadius: 14, marginBottom: '1.2rem', overflow: 'hidden',
      border: `1px solid ${open ? color + '44' : '#0d1f2d'}`,
      boxShadow: open
        ? `0 8px 32px ${color}22, 0 2px 8px rgba(0,0,0,0.4)`
        : '0 2px 12px rgba(0,0,0,0.3)',
      transition: 'all 0.3s',
      background: 'rgba(4,15,26,0.95)',
    }}>
      {/* Card Header */}
      <div onClick={() => setOpen(!open)} style={{
        padding: '1.2rem 1.4rem', cursor: 'pointer',
        background: open
          ? `linear-gradient(135deg, rgba(${hexToRgb(color)},0.12), rgba(0,10,20,0.9))`
          : 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(0,10,20,0.5))',
        borderBottom: `1px solid ${open ? color + '22' : 'transparent'}`,
        transition: 'all 0.3s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            {/* Line pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
              {route.legs.map((leg, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Pill mode={leg.mode} lineName={leg.lineName} />
                  {i < route.legs.length - 1 && (
                    <span style={{ color: '#1a3a5a', fontSize: '0.8rem', fontWeight: 700 }}>⟶</span>
                  )}
                </span>
              ))}
            </div>

            {/* Route path */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              {route.legs.map((leg, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: '0.8rem', color: '#4a7a9a', fontWeight: 600 }}>{cleanName(leg.from)}</span>
                  <span style={{ color: color + '88', fontSize: '0.7rem' }}>──</span>
                  <span style={{ fontSize: '0.8rem', color: '#4a7a9a', fontWeight: 600 }}>{cleanName(leg.to)}</span>
                  {i < route.legs.length - 1 && <span style={{ color: '#1a3a5a', margin: '0 2px' }}>│</span>}
                </span>
              ))}
            </div>

            {/* Next departure */}
            {nextDep && (
              <div style={{ fontSize: '0.77rem', color: '#2a5a7a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#1a4a6a' }}>Next:</span>
                <span style={{ color: '#00d4ff', fontWeight: 700, fontFamily: 'monospace' }}>{formatTime(nextDep.startDateTime)}</span>
                <span style={{ color: '#1a3a5a' }}>·</span>
                <span style={{ color: '#2a5a7a' }}>arrives</span>
                <span style={{ color: '#00d4ff', fontWeight: 700, fontFamily: 'monospace' }}>{formatTime(nextDep.arrivalDateTime)}</span>
              </div>
            )}
          </div>

          {/* Right: duration + toggle */}
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
            <div style={{
              fontSize: '1.5rem', fontWeight: 900, color: '#e8f4ff',
              fontFamily: 'monospace', letterSpacing: '-1px',
              textShadow: `0 0 20px ${color}66`,
            }}>
              {formatDuration(route.totalDuration)}
            </div>
            <div style={{
              fontSize: '0.7rem', marginTop: 2, fontWeight: 700,
              color: changes === 0 ? '#00ff88' : '#f0a030',
            }}>
              {changes === 0 ? '✓ Direct' : `${changes} change${changes > 1 ? 's' : ''}`}
            </div>
            <div style={{
              marginTop: 8, fontSize: '0.65rem',
              background: `${color}18`,
              border: `1px solid ${color}33`,
              color: color,
              borderRadius: 20, padding: '3px 10px',
              cursor: 'pointer',
            }}>
              {open ? '▲ Hide' : `▼ ${route.departures?.length || 0} train${route.departures?.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
      </div>

      {/* Departures */}
      {open && (
        <div style={{ padding: '1rem 1.2rem', background: 'rgba(2,8,16,0.95)' }}>
          <div style={{
            fontSize: '0.62rem', color: '#1a4a6a', fontWeight: 800,
            marginBottom: 12, textTransform: 'uppercase', letterSpacing: '2px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 8px #00d4ff' }} />
            Upcoming trains — tap to expand
          </div>
          {route.departures?.map((dep, i) => <DepartureRow key={i} dep={dep} index={i} />)}
        </div>
      )}
    </div>
  );
}

// ─── Hex to RGB helper ────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError(''); setRoutes([]); setSearched(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/journey`, {
        params: {
          from, to,
          date: date ? date.replace(/-/g, '') : undefined,
          time: time ? time.replace(':', '') : undefined,
        },
        timeout: 45000,
      });
      setRoutes(data.routes || []);
      if (!data.routes?.length) setError('No routes found. Try different stations.');
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Try again.');
      } else {
        setError(err.response?.data?.error || 'Could not fetch journey. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%', padding: '0.8rem 1rem', fontSize: '0.95rem',
    boxSizing: 'border-box',
    background: focusedField === field ? 'rgba(0,212,255,0.05)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${focusedField === field ? '#00d4ff66' : '#0d2035'}`,
    borderRadius: 8, outline: 'none',
    color: '#e8f4ff', transition: 'all 0.2s',
    boxShadow: focusedField === field ? '0 0 16px rgba(0,212,255,0.15)' : 'none',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #020810 0%, #040f1a 50%, #020c16 100%)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#e8f4ff',
    }}>

      {/* Ambient background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(2,8,16,0.95)',
        borderBottom: '1px solid rgba(0,212,255,0.1)',
        backdropFilter: 'blur(20px)',
        padding: '1rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <TubeLogo />
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '1px', color: '#e8f4ff' }}>
              LONDON JOURNEY PLANNER
            </div>
            <div style={{ fontSize: '0.7rem', color: '#00d4ff', letterSpacing: '3px', marginTop: 1, opacity: 0.8 }}>
              TUBE · DLR · ELIZABETH LINE
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <LiveClock />
          <div style={{ fontSize: '0.7rem', color: '#1a4a6a', letterSpacing: '1px', textAlign: 'right' }}>
            <div style={{ color: '#00ff8844', fontSize: '0.6rem' }}>● LIVE</div>
            <div>TfL API</div>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>

        {/* Search Panel */}
        <div style={{
          background: 'rgba(4,15,26,0.9)',
          border: '1px solid #0d2035',
          borderRadius: 16, padding: '1.8rem',
          marginBottom: '2rem',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,212,255,0.05)',
        }}>
          <div style={{ fontSize: '0.65rem', color: '#00d4ff', letterSpacing: '3px', marginBottom: 16, fontWeight: 700 }}>
            ◈ PLAN YOUR JOURNEY
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.62rem', color: '#00d4ff88', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '2px', textTransform: 'uppercase' }}>
                  FROM
                </label>
                <input
                  placeholder="e.g. Stratford"
                  value={from} onChange={e => setFrom(e.target.value)} required
                  onFocus={() => setFocusedField('from')} onBlur={() => setFocusedField(null)}
                  style={inputStyle('from')}
                />
              </div>
              <button
                type="button"
                onClick={() => { const tmp = from; setFrom(to); setTo(tmp); }}
                style={{
                  width: 38, height: 38, borderRadius: '50%', marginBottom: 1,
                  border: '1px solid #0d2035',
                  background: 'rgba(0,212,255,0.07)',
                  cursor: 'pointer', fontSize: '1rem', color: '#00d4ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: '0 0 12px rgba(0,212,255,0.1)',
                }}>
                ⇄
              </button>
              <div>
                <label style={{ fontSize: '0.62rem', color: '#00d4ff88', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '2px', textTransform: 'uppercase' }}>
                  TO
                </label>
                <input
                  placeholder="e.g. Canary Wharf"
                  value={to} onChange={e => setTo(e.target.value)} required
                  onFocus={() => setFocusedField('to')} onBlur={() => setFocusedField(null)}
                  style={inputStyle('to')}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.62rem', color: '#00d4ff88', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '2px', textTransform: 'uppercase' }}>
                  DATE
                </label>
                <input
                  type="date" value={date} onChange={e => setDate(e.target.value)}
                  onFocus={() => setFocusedField('date')} onBlur={() => setFocusedField(null)}
                  style={{ ...inputStyle('date'), colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.62rem', color: '#00d4ff88', fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '2px', textTransform: 'uppercase' }}>
                  TIME
                </label>
                <input
                  type="time" value={time} onChange={e => setTime(e.target.value)}
                  onFocus={() => setFocusedField('time')} onBlur={() => setFocusedField(null)}
                  style={{ ...inputStyle('time'), colorScheme: 'dark' }}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              padding: '0.9rem',
              background: loading
                ? 'rgba(0,212,255,0.05)'
                : 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,100,200,0.2))',
              color: loading ? '#1a4a6a' : '#00d4ff',
              border: `1px solid ${loading ? '#0d2035' : '#00d4ff44'}`,
              borderRadius: 9, fontSize: '0.95rem', fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '2px', textTransform: 'uppercase',
              boxShadow: loading ? 'none' : '0 0 20px rgba(0,212,255,0.15)',
              transition: 'all 0.3s',
            }}>
              {loading ? '⟳  SEARCHING...' : '⟶  PLAN JOURNEY'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(220,30,30,0.08)',
            border: '1px solid rgba(220,30,30,0.3)',
            borderLeft: '3px solid #dc1e1e',
            borderRadius: 10, padding: '0.85rem 1rem',
            color: '#ff6b6b', marginBottom: '1.5rem', fontSize: '0.88rem',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Route count */}
        {routes.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: '1rem', fontSize: '0.62rem',
            color: '#1a4a6a', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '2px',
          }}>
            <span style={{
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid #00d4ff44',
              color: '#00d4ff', borderRadius: 20,
              padding: '2px 10px', fontSize: '0.68rem',
            }}>
              {routes.length}
            </span>
            ROUTE OPTION{routes.length !== 1 ? 'S' : ''} FOUND
          </div>
        )}

        {/* Routes */}
        {routes.map((r, i) => <RouteCard key={i} route={r} index={i} />)}

        {/* Empty state */}
        {!loading && !error && !searched && (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%', margin: '0 auto 1.5rem',
              background: 'rgba(0,212,255,0.05)',
              border: '1px solid rgba(0,212,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(0,212,255,0.08)',
            }}>
              <TubeLogo />
            </div>
            <div style={{ fontSize: '1rem', color: '#1a4a6a', fontWeight: 600, letterSpacing: '1px' }}>
              Enter stations to plan your journey
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0d2a3a', marginTop: 6, letterSpacing: '2px' }}>
              TUBE · DLR · ELIZABETH LINE
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
