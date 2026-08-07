# 🏛️ System Architecture — Who Is The Imposter?

This document outlines the architectural design and deployment modes of **Who Is The Imposter?**.

---

## Overview

The application is structured into two main operational architectures:
1. **Frontend-Only (Classic Pass-and-Play)**: Client-side state machine running in the browser. Ideal for offline parties on a single device.
2. **Authoritative Backend (FastAPI + WebSocket)**: Server-managed game state with multi-device real-time synchronization across phones and computers.

---

## 1. Frontend-Only Mode (Pass-and-Play)

* **Components**: `index.html`, `styles.css`, `script.js`.
* **State Management**: All game rooms, players, roles, and secret words reside in browser memory (`App` state object).
* **Security**: Relies on device handover and anti-cheat screen hiding (detecting tab switches / visibility changes).
* **Advantages**: Zero backend setup, instant startup, works entirely offline.

---

## 2. Full-Stack Authoritative Mode (FastAPI + WebSocket)

* **Components**: 
  * `backend/`: FastAPI application (`app/main.py`), game engine (`app/game_engine.py`), WebSocket manager (`app/ws.py`), and storage repositories (`app/storage/`).
  * `frontend/api.js`: Client-side adapter communicating with REST endpoints and real-time WebSocket channels.
* **Security & Isolation**: 
  * Room state (`Room`) is maintained on the server.
  * Each player authenticates via a secret token (`X-Player-Token`) to retrieve their assigned word/role, preventing inspection via browser developer tools.
* **Real-Time Broadcasting**: 
  * WebSocket connections (`WS /api/rooms/{id}/ws`) broadcast state changes (player joins, game starts, votes cast, round transitions) instantly to all connected clients.

---

## 3. Storage Architecture

The backend abstracts word bank access using the `WordRepository` interface:
* **`LocalCsvWordRepository`**: Reads/writes a local CSV file (`data/words.csv`).
* **`R2WordRepository`**: Reads/writes from Cloudflare R2 object storage (S3-compatible) with in-memory TTL caching.
* **`D1WordRepository`**: Interacts with Cloudflare D1 (managed SQLite) via the D1 REST API using `httpx` for structured, row-level ACID transactions.
