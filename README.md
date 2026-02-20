# 🚇 London Journey Planner

> Real-time London transit planner for Tube, DLR & Elizabeth line — built with React, Node.js and the TfL Unified API.

![London Journey Planner](https://img.shields.io/badge/TfL-Powered-E32017?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCI+PGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjIiIGZpbGw9IiNFMzIwMTciLz48L3N2Zz4=)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## ✨ Features

- 🚇 **Multi-mode routing** — Tube, DLR, and Elizabeth line routes in one search
- 🕐 **Live departure times** — Real-time data from the TfL Unified API
- 📍 **Stop-by-stop breakdowns** — Every intermediate station displayed per leg
- 🔀 **Smart deduplication** — Multiple route options ranked by speed and changes
- 🛑 **HUB → NaPTAN resolution** — Resolves complex interchange stations correctly
- 🌙 **Futuristic dark UI** — Glassmorphism design with live clock and TfL line colours
- ⚡ **Parallel API querying** — Multiple mode-specific station pairs queried simultaneously

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Axios |
| Backend | Node.js, Express |
| API | TfL Unified API |
| Styling | Inline CSS with glassmorphism |
| Environment | dotenv |

---

## 📁 Project Structure

```
london-journey-planner/
├── london-journey-backend/
│   ├── index.js          # Express server + TfL API logic
│   ├── .env              # TfL API key (not committed)
│   └── package.json
├── src/
│   ├── App.jsx           # Full React frontend
│   └── main.jsx
├── public/
├── index.html
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- A free [TfL API key](https://api-portal.tfl.gov.uk/)

---

### 1. Clone the repository

```bash
git clone https://github.com/panchalparth22/london-underground.git
cd london-underground
```

### 2. Set up the backend

```bash
cd london-journey-backend
npm install
```

Create a `.env` file:

```env
TFL_API_KEY=your_tfl_api_key_here
PORT=5000
```

Start the backend:

```bash
node index.js
```

> Backend runs on `http://localhost:5000`

---

### 3. Set up the frontend

```bash
# From the root directory
npm install
npm run dev

> Frontend runs on `http://localhost:5173`

---

## 🔌 API Endpoints

### `GET /api/journey`

Returns route options between two London stations.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `from` | string | ✅ | Origin station name |
| `to` | string | ✅ | Destination station name |
| `date` | string | ❌ | Date in `YYYYMMDD` format |
| `time` | string | ❌ | Time in `HHMM` format |

**Example:**
```
GET /api/journey?from=Stratford&to=Canary%20Wharf
```

**Response:**
```json
{
  "routes": [
    {
      "mode": "tube",
      "lineName": "Jubilee",
      "from": "Stratford",
      "to": "Canary Wharf",
      "totalDuration": 9,
      "legs": [...],
      "departures": [...]
    }
  ]
}
```

### `GET /health`

Returns server status.

```json
{ "status": "ok" }
```

---

## 🗺️ How It Works

1. **Station Search** — Searches TfL `/StopPoint/Search` for matching stations
2. **HUB Resolution** — Expands HUB IDs (e.g. `HUBSRA`) into real NaPTAN IDs per mode
3. **Parallel Querying** — Queries up to 9 mode-specific station pairs simultaneously
4. **Deduplication** — Merges duplicate journeys by route signature
5. **Sequence Cache** — Pre-fetches line sequences for accurate stop-by-stop display
6. **Leg Enrichment** — Resolves intermediate stops from cache with fuzzy name matching
7. **Filtering** — Removes bus/coach legs and routes not ending at the destination

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `TFL_API_KEY` | Your TfL Unified API key |
| `PORT` | Backend port (default: `5000`) |

---

## 📜 License

MIT © [Parth Panchal](https://github.com/panchalparth22)

---

<div align="center">
  <sub>Powered by the <a href="https://api-portal.tfl.gov.uk/">TfL Unified API</a> · Built with ❤️ in London</sub>
</div>
```


