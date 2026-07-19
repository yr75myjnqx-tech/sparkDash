# sparkDash · Multi-DGX Spark Monitoring Dashboard

<p align="center">
  <img src="https://img.shields.io/badge/platform-arm64-2d9d78?style=flat-square" alt="Platform: ARM64">
  <img src="https://img.shields.io/badge/React-19-58c4dc?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express" alt="Express 5">
  <img src="https://img.shields.io/badge/license-MIT-2d9d78?style=flat-square" alt="MIT License">
  <br>
  <sub>by <a href="https://x.com/MiaAI_lab">Mia'a AI Lab</a></sub>
</p>

**sparkDash** is a real-time web dashboard for monitoring one or more **NVIDIA DGX Spark (GB10)** units from a single browser window. View GPU metrics, CPU load, memory bandwidth, storage I/O, network throughput, and local LLM server performance — all at a glance.

Add new Sparks from the UI at runtime. No code changes, no server restarts.

---

## ✨ Features

- **Multi-unit monitoring** — watch any number of DGX Sparks on one dashboard. Each Spark gets its own tabbed page with full metrics.
- **Real-time WebSocket streaming** — live-updating GPU, CPU, RAM, storage, network, and LLM data with configurable poll intervals.
- **Local & remote Sparks** — monitor the host the container runs on (direct sysfs/proc access) *and* remote units over SSH — all through the same collector code.
- **LLM server auto-detection** — probes each Spark's port 8888 and identifies the backend (llama.cpp, vLLM, sglang) with live tokens/sec for both generation and prefill.
- **Unified memory tracking** — monitors the GB10's 128 GB HBM3e unified memory pool with GPU/CPU split and live memory bandwidth via `nvidia-smi dmon`.
- **🎨 Four themes** — dark (pure neutral grays, no blue tint), light (warm paper), cool white (neutral), and OLED (true black). No AI-slop colors.
- **SSH password encryption** — AES-256-GCM encrypted secrets survive container restarts. Passwords never touch `sparks.json` or API responses.
- **Fully Dockerized** — single container with privileged access for host metrics. Compose files for dev and production.
- **Hot-add configuration** — add, edit, remove, and reorder Sparks from the UI. No config files, no restarts.

---

## 🖥️ Screenshots

<img src="./assets/screenshot.png" alt="sparkDash dashboard screenshot showing the Overview page with multiple DGX Spark units, GPU metrics, and LLM status" width="800">

*The Overview page showing multiple DGX Spark units with GPU usage, temperature, VRAM, and LLM throughput at a glance.*

---

## 🚀 Quick Start

### Prerequisites

- An **NVIDIA DGX Spark (GB10)** — or any ARM64 Linux host with an NVIDIA GPU
- Docker & Docker Compose
- For remote Sparks: SSH access (key or password) + `sshpass` (already in the Docker image)

### Production (Docker)

```bash
# Clone the repo
git clone https://github.com/your-org/sparkdash.git
cd sparkdash

# Start the dashboard
docker compose up --build -d
```

Open **http://<host-ip>:5555** in your browser.

### Development

```bash
npm install
npm run dev
```

This starts the Vite dev server (port 5173, with HMR) and the Express API server (port 5555) concurrently. The Vite dev server proxies `/api` and `/ws` requests to the Express backend.

### Production from source

```bash
npm install
npm run build     # Build the React frontend
npm start         # Start the Express server (serves built frontend from dist/)
```

---

## 🏗️ Architecture

sparkDash follows a **"one Spark model, N instances"** principle. There are no per-Spark-number duplicated methods. Every Spark is a config record in `sparks.json`; the same `SparkMonitor`, `SystemCollector`, and `LlmProbe` code runs for all of them. Adding a Spark is a **config change, not a code change**.

```txt
┌─────────────────────────── Docker container (sparkDash) ───────────────────────────┐
│                                                                                     │
│  Express server (server/)                                                           │
│  ├─ config/sparks.json           ← Spark registry (read/write via API)              │
│  ├─ SparkRegistry                ← loads + persists Sparks; emits change events     │
│  ├─ SparkMonitor (per Spark)     ← owns one collector + one LLM probe + rate state  │
│  │   ├─ SystemCollector          ← hw metrics: local sysfs/proc OR remote via SSH   │
│  │   └─ LlmProbe                 ← HTTP to <lanIp>:8888, backend autodetect         │
│  ├─ REST /api/*                                                                     │
│  └─ WebSocket (per client)       ← pushes { sparks: [ {id, name, status, metrics} ] │
│                                                                                     │
│  React SPA (src/)                                                                   │
│  └─ Top tabs: [Spark 1] [Spark 2] [+] → page per Spark + Overview dashboard         │
└─────────────────────────────────────────────────────────────────────────────────────┘
        │ SSH (key or sshpass)               │ HTTP :8888
        ▼                                      ▼
   remote Spark(s)                        each Spark's LLM server
```

### Data Flow

```txt
Browser ←→ WebSocket (/ws) ←→ SparkMonitor.snapshot() ←→ SystemCollector + LlmProbe
Browser ←→ REST (/api/*)   ←→ SparkRegistry (sparks.json) + SparkMonitor
```

Background poll loops run continuously (independent of WebSocket clients) so rate-based metrics (token diffs, byte diffs, sector diffs) stay accurate.

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| **Backend** | Node.js, Express 5, WebSocket (ws) |
| **Language** | ESM JavaScript (server) + TypeScript (client) |
| **Platform** | ARM64 — NVIDIA DGX Spark GB10 (Neoverse V2) |
| **Deployment** | Docker (multi-stage, arm64) |
| **Encryption** | AES-256-GCM (SSH passwords) |
| **Port** | 5555 (dashboard), 5173 (Vite dev server) |

---

## 📦 Repository Structure

```
sparkDash/
├── src/                          # Frontend (React + TypeScript)
│   ├── main.tsx                  # React root mount
│   ├── App.tsx                   # Shell: header, tabs, SparkPage, dialogs
│   ├── index.css                 # Tailwind v4 + 4 themes (CSS custom properties)
│   ├── api/
│   │   ├── client.ts             # REST fetch helpers
│   │   └── types.ts              # TypeScript interfaces (SparkConfig, metrics, WS)
│   ├── hooks/
│   │   └── useSnapshot.ts        # WebSocket hook
│   ├── components/
│   │   ├── SparkTabs.tsx          # Drag-reorderable tab bar
│   │   ├── AddSparkDialog.tsx     # Add Spark form
│   │   ├── EditSparkDialog.tsx    # Edit/remove Spark form
│   │   ├── SettingsDialog.tsx     # Global settings
│   │   ├── ThemeSwitch.tsx        # Dark/light/white/OLED toggle
│   │   ├── OverviewPage/          # Cross-Spark summary grid
│   │   ├── SparkPage/             # Per-Spark metrics (GPU, CPU, Storage, Network, LLM)
│   │   └── ui/                    # Reusable primitives (Panel, MetricBar, Sparkline, icons)
│   └── constants.ts
├── server/                       # Backend (Node.js + Express, plain JS)
│   ├── index.js                  # Express + WebSocket entrypoint, all REST routes inline
│   ├── config.js                 # Constants, env vars, DGX Spark specs
│   ├── validate.js               # Input validation, SSRF protection, rate limiting
│   ├── settings.js               # Global settings (poll interval, default LLM port, auto-hide)
│   ├── secretsStore.js           # AES-256-GCM encrypted SSH password persistence
│   ├── sparks/
│   │   ├── SparkRegistry.js      # CRUD for sparks.json + change events
│   │   └── SparkMonitor.js       # Per-Spark poll loops + rate tracking
│   ├── util/
│   │   └── atomicWrite.js        # Atomic (tmp + rename) file writes
│   └── collectors/
│       ├── SystemCollector.js    # GPU, CPU, RAM, storage, network, unified memory
│       ├── LlmProbe.js           # LLM backend auto-detection + live tok/s
│       └── ssh.js                # SSH exec (key + sshpass)
├── config/                       # Runtime config (Docker volume)
│   ├── sparks.json               # Spark registry (gitignored)
│   ├── sparks-secrets.json       # Encrypted SSH passwords (gitignored)
│   ├── settings.json             # Global settings (gitignored)
│   └── .secrets-key              # Encryption key (gitignored)
├── Dockerfile                    # Multi-stage arm64 production build
├── Dockerfile.dev                # Development with live reload
├── docker-compose.yml            # Production compose
├── docker-compose.dev.yml        # Development compose (source mount, HMR)
├── deploy.sh                     # Deploy/refresh script
└── .env.example                  # Environment variable template
```

---

## 🌐 REST API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/sparks` | List all Sparks (passwords redacted) |
| POST | `/api/sparks` | Add a Spark (starts its monitor) |
| PATCH | `/api/sparks/:id` | Update a Spark (hot-swaps config) |
| DELETE | `/api/sparks/:id` | Remove a Spark (drains its monitor) |
| PUT | `/api/sparks/order` | Reorder Sparks (persisted) |
| GET | `/api/sparks/:id/metrics` | One-shot metrics snapshot |
| POST | `/api/sparks/test` | Ephemeral SSH + LLM test (no persist) |
| POST | `/api/sparks/:id/test` | Test SSH + LLM connectivity (saves password) |
| PUT | `/api/sparks/:id/password` | Save SSH password (works while host offline) |
| PUT | `/api/sparks/:id/disabled-devices` | Disable storage devices (hot) |
| PUT | `/api/sparks/:id/disabled-interfaces` | Disable network interfaces (hot) |
| PUT | `/api/sparks/:id/llm-port` | Update LLM probe port (hot) |
| GET | `/api/settings` | Get global settings |
| PUT | `/api/settings` | Update global settings |
| WS | `/ws` | Real-time metrics stream |

---

## ⚙️ Configuration

### Global Settings

Configured via the gear icon in the dashboard header or the REST API:

| Setting | Default | Description |
|---------|---------|-------------|
| Poll interval | 2000 ms | WebSocket broadcast interval (clamped ≥ 1000 ms) |
| Default LLM port | 8888 | Default port for LLM probing on new Sparks |
| Auto-hide offline | false | Hide offline Sparks from the overview grid |

### Environment Variables

Copy `.env.example` to `.env` and customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5555 | Express server port |
| `LLM_PORT` | 8888 | Default LLM probe port |
| `POLL_INTERVAL_GPU` | 2000 | GPU polling interval (ms) |
| `POLL_INTERVAL_CPU` | 2000 | CPU polling interval (ms) |
| `POLL_INTERVAL_NETWORK` | 2000 | Network polling interval (ms) |
| `POLL_INTERVAL_STORAGE` | 5000 | Storage polling interval (ms) |
| `POLL_INTERVAL_LLM` | 2000 | LLM probing interval (ms) |
| `POLL_INTERVAL_BANDWIDTH` | 1000 | Memory bandwidth sampling interval (ms) |

### Adding a Spark

1. Click the **+** tab in the header.
2. Fill in: **Name**, **LAN IP** (required), **CX7 IP** (optional), **SSH user**, and **auth method** (key or password).
3. Use the **Test Connection** button to verify SSH + LLM reachability.
4. Save — a new tab appears and begins streaming metrics immediately.

### Themes

Click the theme toggle in the header (sun/moon icon) to cycle through:

| Theme | Description |
|-------|-------------|
| **Dark** (default) | Pure neutral grays, true black base, zero blue component. Muted amber accent. |
| **Light** | Warm paper whites, amber accent. |
| **White** | Cool neutral whites, no warm tones. |
| **OLED** | True black background for maximum contrast on OLED displays. |

Themes persist to `localStorage` across sessions.

---

## 🔒 Security

- **SSH passwords are never stored in `sparks.json`** and are **never returned by any API endpoint**.
- Passwords are encrypted with **AES-256-GCM** and persisted to `config/sparks-secrets.json`. They survive Docker restarts.
- The encryption key lives in `config/.secrets-key` (auto-generated) or can be set via the `SPARKDASH_SECRETS_KEY` environment variable. **Never delete this file** — it would orphan all encrypted secrets.
- **SSRF protection**: input validation blocks link-local and metadata IP addresses (169.254.x.x, 127.x.x.x, 10.0.0.1/8, 172.16-31.x.x, 192.168.x.x are allowed; 0.0.0.0/8, 100.x.x.x, fe80::/10 are blocked).
- All SSH/HTTP calls use short timeouts (3s HTTP, 5s SSH connect timeout) to avoid hanging the poll loop.
- **Prefer SSH key authentication** over password-based auth.

---

## 🐳 Docker

### Production

```bash
docker compose up --build -d
```

The production compose configuration:
- Builds an arm64 multi-stage image
- Mounts `/proc`, `/sys`, and `/` (read-only) for local Spark metrics
- Mounts `nvidia-smi` and CUDA driver libraries for GPU metrics
- Persists `config/` as a volume (survives container recreation)
- Runs with `privileged: true` (required for nsenter-based host metric access)
- Auto-restarts on crash (`restart: unless-stopped`)
- Uses `node --watch` for server-side file change reloads

### Development

```bash
docker compose -f docker-compose.dev.yml up --build
```

Source-mounted with Vite HMR for frontend development.

---

## 📜 Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development: concurrent Vite (5173) + Express (5555) with hot reload |
| `npm run dev:server` | Express only with `node --watch` |
| `npm run dev:client` | Vite dev server only |
| `npm run build` | Build frontend to `dist/` |
| `npm start` | Production: `node server/index.js` |
| `npm run docker:up` | `docker compose up -d` |
| `npm run docker:dev` | Docker dev compose |
| `npm run docker:prod` | Docker production compose |
| `npm run docker:rebuild` | Docker compose up --build -d |
| `./deploy.sh` | Deploy/refresh container (--build, --frontend flags) |

---

## 🧠 Architecture Highlights

### Local vs. Remote Sparks

The same `SystemCollector` code handles both local and remote Sparks. When `spark.isLocal` is `true`, metrics are read directly via sysfs, procfs, and `nvidia-smi` (using nsenter into the host namespace). For remote Sparks, every command is wrapped in SSH via the centralized `sshExec()` helper.

### Graceful Degradation

All collectors catch errors and return default/zero metrics rather than crashing the poll loop. A Spark is marked `online: false` after 10 seconds of failed liveness checks. The frontend handles offline Sparks gracefully, showing stale data or placeholder states.

### Hot Configuration Updates

Editing a Spark's config (name, IP, SSH credentials) or LLM port updates the running `SparkMonitor` without tearing down its poll loops or losing rate baselines. Config changes are atomic — written to a temp file and renamed into place.

### LLM Probe

The `LlmProbe` auto-detects the running LLM backend:
- **llama.cpp** — detected via `/slots` endpoint; extracts model name from `/props`, computes live tok/s from per-slot decoded token diffs.
- **vLLM / sglang** — detected via `/v1/models`; sglang identified from `/get_server_info`, vLLM from Prometheus `/metrics` counters. Cumulative token counters are diffed against per-Spark baselines for live rates.
- Scientific notation in Prometheus values (e.g., `2.508e+06`) is handled correctly.

---

## 🤝 Contributing

Contributions are welcome! Please read through the existing code — the project follows ESM throughout, plain JavaScript on the server, TypeScript on the frontend.

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgements

- Built for the **NVIDIA DGX Spark (GB10)** platform on ARM64
- Inspired by a legacy monitoring dashboard — rebuilt with proper architecture (no copy-paste Spark-numbering)
- LLM probe logic ported and refined from battle-tested production code
