# 🚀 Ai Là Người Giấu Mặt — Backend (FastAPI)

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Realtime-orange?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-S3_Compatible-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://www.cloudflare.com/developer-platform/products/r2/)

Authoritative backend service for **Who Is The Imposter?**, replacing the previous client-side pass-and-play state management to ensure secure role/secret distribution and multi-device real-time gameplay.

---

## 💡 Why Backend?

In the previous frontend-only version, secret words and roles for **all players** were stored directly in browser state (`App.players`), making them easily inspectable via developer tools. The new authoritative architecture introduces:

* **Secure State Isolation**: The server maintains the room state (`Room`) and delivers each player's secret word/clue exclusively to the authenticated caller via a token-secured endpoint (`GET /api/rooms/{id}/players/{pid}/secret`, header `X-Player-Token`).
* **Multi-Device & Real-Time Sync**: Supports playing across multiple independent devices (one phone per player) via real-time WebSocket state broadcasting (`WS /api/rooms/{id}/ws`). Pass-and-play mode remains fully supported by calling endpoints sequentially on a single device.
* **Extensible Word Bank**: Decoupled via the `WordRepository` interface supporting multiple backends (`local` CSV file or Cloudflare R2 / S3-compatible storage) switchable via environment variables without code modification.

---

## 🗂️ Project Structure

```text
backend/
├── app/
│   ├── main.py            # FastAPI app setup & CORS middleware
│   ├── config.py          # Environment settings (.env parser & storage selection)
│   ├── models.py          # Pydantic schemas (Room, Player, WordEntry, etc.)
│   ├── game_engine.py     # Pure Python game logic (decoupled from FastAPI for unit testing)
│   ├── ws.py              # WebSocket connection manager & room broadcasting
│   ├── routers/
│   │   └── rooms.py       # REST API & WebSocket endpoints
│   └── storage/
│       ├── base.py        # Abstract WordRepository interface
│       ├── local.py       # Local CSV file reader
│       ├── r2.py          # Cloudflare R2 / S3 reader with TTL caching
│       └── factory.py     # Factory pattern for selecting storage backend
├── data/
│   └── words.csv          # Default word bank (used when WORDBANK_BACKEND=local)
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variables template
└── README.md
```

---

## ⚙️ Getting Started (Local Development)

### Prerequisites

* Python 3.10 or higher
* pip / virtualenv

### Setup Instructions

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   python -m venv .venv
   # Windows PowerShell / CMD:
   .venv\Scripts\activate.bat
   # macOS / Linux:
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Default WORDBANK_BACKEND=local is ready out of the box
   ```

5. **Start the FastAPI development server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

6. **Verify health check:**
   ```bash
   curl http://localhost:8000/api/health
   # Response: {"status": "ok"}
   ```

---

## ☁️ Cloudflare R2 / S3 Storage Integration

To store and load the word bank remotely via Cloudflare R2 (or AWS S3, MinIO, Backblaze B2):

1. Create an R2 bucket in your Cloudflare Dashboard and upload `words.csv` (formatted with 3 columns: `tu_that,tu_lien_quan,goi_y`).
2. Generate API Credentials (Access Key ID & Secret Access Key) under R2 > Manage API Tokens.
3. Update `.env`:
   ```env
   WORDBANK_BACKEND=r2
   R2_BUCKET=your-bucket-name
   R2_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=your_access_key_id
   R2_SECRET_ACCESS_KEY=your_secret_access_key
   WORDBANK_OBJECT_KEY=words.csv
   WORDBANK_CACHE_TTL=300
   ```
4. Restart the server — `R2WordRepository` automatically caches CSV data in-memory according to `WORDBANK_CACHE_TTL` to minimize API calls.

---

## 🔌 API Endpoints Reference

| Action | Method & Endpoint | Authentication Header | Description |
| :--- | :--- | :--- | :--- |
| **Create Room** | `POST /api/rooms` | None | Initializes a new room and returns `{room_id, host_token}` |
| **Join Room** | `POST /api/rooms/{id}/players` | None | Adds player `{name}` and returns `{player_id, player_token}` |
| **Update Config** | `PATCH /api/rooms/{id}/config` | `X-Host-Token` | Host updates game settings (imposter count, mode, timer) |
| **Start Game** | `POST /api/rooms/{id}/start` | `X-Host-Token` | Distributes roles/words and starts the game |
| **Get Secret Word** | `GET /api/rooms/{id}/players/{pid}/secret` | `X-Player-Token` | Retrieves private word/clue for the specific player |
| **Submit Vote** | `POST /api/rooms/{id}/vote` | None | Records a vote (`{voter_id, target_id}`) |
| **Tally & Eliminate** | `POST /api/rooms/{id}/tally-eliminate` | `X-Host-Token` | Eliminates the player with the most votes |
| **Manual Eliminate** | `POST /api/rooms/{id}/eliminate/{target_id}` | `X-Host-Token` | Force eliminates a specific player |
| **Get Public State** | `GET /api/rooms/{id}/state` | None | Returns public room state and player list |
| **Reset Game** | `POST /api/rooms/{id}/reset?keep_players=true` | `X-Host-Token` | Resets game for a new round |
| **Real-time Sync** | `WS /api/rooms/{id}/ws` | None | WebSocket connection for real-time state broadcasts |

---

## 🔮 Future Architecture Roadmap

* **Distributed Room Store**: Current `RoomStore` is in-memory. The `get/create/delete` interface is fully decoupled, ready to be swapped with a Redis-backed implementation (`ROOM_STORE_BACKEND`) for horizontal scaling across multiple instances.
* **Frontend Integration**: Frontend (`index.html` / `script.js`) can seamlessly integrate by mapping local state calls to these REST/WS endpoints, preserving the complete pass-and-play UI/UX experience.
