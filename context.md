# Project Context: Who Is The Imposter?

## Overview
**Who Is The Imposter?** is a real-time and pass-and-play party social deduction game (inspired by Mafia / Among Us) where players receive secret words or clues, discuss, and vote to eliminate the imposter.

## Architecture
The project supports two main deployment modes:
1. **Classic Pass-and-Play (Frontend-Only)**: Runs entirely client-side on a single device (`index.html`, `styles.css`, `script.js`).
2. **Authoritative Backend (FastAPI + WebSocket)**: Multi-device real-time sync with secure role/secret distribution (`backend/`).

## Tech Stack
* **Frontend**: HTML5, CSS3, Vanilla JavaScript (Single-Page Application architecture).
* **Backend**: Python 3.10+, FastAPI, WebSockets (`uvicorn`).
* **Storage Abstraction (`WordRepository`)**:
  * Local CSV (`backend/data/words.csv`)
  * Cloudflare R2 (S3-compatible object storage with TTL cache)
  * Cloudflare D1 (Managed SQLite database via Cloudflare REST API using `httpx`)
* **CLI Management Tool**: `backend/manage_words.py` for full Word Bank CRUD across backends (`local`, `r2`, `d1`).

## Directory Structure
```text
WhoIsTheImposter/
├── .github/                  # GitHub issue & PR templates
├── backend/                  # FastAPI backend service
│   ├── app/                  # Application core (routers, storage, ws, models)
│   ├── data/                 # Default word bank CSV
│   ├── manage_words.py       # CLI tool for Word Bank management
│   ├── requirements.txt      # Python dependencies
│   └── README.md             # Backend documentation
├── docs/                     # Detailed project documentation
│   ├── architecture.md       # System architecture guide
│   ├── wordbank.md           # Word bank and CLI usage guide
│   └── api.md                # REST API and WebSocket protocol reference
├── frontend/                 # Web client
│   ├── index.html            # SPA markup & views
│   ├── styles.css            # Responsive styling & UI animations
│   ├── script.js             # Client state machine & pass-and-play logic
│   ├── api.js                # REST/WebSocket client wrapper
│   └── README.md             # Frontend documentation
├── CHANGELOG.md              # Project changelog (0.1.0 to 0.3.3.beta)
├── LICENSE.txt               # MIT License
└── README.md                 # Root documentation (English)
└── README.vie.md             # Root documentation (Vietnamese)
```

## Key Guidelines for Agents
1. **Conventions**: Adhere strictly to existing project code style, typing patterns, and file structure.
2. **Storage**: All word bank operations must go through the `WordRepository` interface.
3. **Environment**: Backend credentials and backend selection (`WORDBANK_BACKEND`) are configured via `backend/.env`.
4. **Documentation**: Keep documentation files (`docs/`, `CHANGELOG.md`, `README.md`) updated when introducing architectural changes or new features.
