# 🔌 REST API & WebSocket Reference — Who Is The Imposter? (Optional)

> The offline Web/PWA/Android frontend does not call this API. This document only covers the optional FastAPI service retained for future or experimental multi-device work.

This document specifies the REST API endpoints and WebSocket protocol provided by the FastAPI backend (`backend/app/routers/rooms.py`).

---

## REST Endpoints

### 1. Room Management

* **`POST /api/rooms`**
  * **Description**: Initializes a new game room.
  * **Response**: `{"room_id": "...", "host_token": "..."}`

* **`POST /api/rooms/{room_id}/players`**
  * **Description**: Joins a room with a player name.
  * **Body**: `{"name": "PlayerName"}`
  * **Response**: `{"player_id": "...", "player_token": "...", "name": "..."}`

* **`PATCH /api/rooms/{room_id}/config`**
  * **Description**: Updates room configuration (Host only).
  * **Header**: `X-Host-Token: <host_token>`
  * **Body**: `{"imposter_count": 1, "imposter_mode": "aware", "timer_seconds": 60, ...}`
  * **Response**: Updated room configuration object.

---

### 2. Game Lifecycle

* **`POST /api/rooms/{room_id}/start`**
  * **Description**: Distributes roles and secret words, transitioning room state to `revealing` or `playing` (Host only).
  * **Header**: `X-Host-Token: <host_token>`

* **`GET /api/rooms/{room_id}/players/{player_id}/secret`**
  * **Description**: Retrieves the private word/clue for an authenticated player.
  * **Header**: `X-Player-Token: <player_token>`
  * **Response**: `{"word": "...", "clue": "...", "role": "..."}`

* **`POST /api/rooms/{room_id}/vote`**
  * **Description**: Submits a vote against a target player.
  * **Body**: `{"voter_id": "...", "target_id": "..."}`

* **`POST /api/rooms/{room_id}/tally-eliminate`**
  * **Description**: Tallies votes and eliminates the targeted player (Host only).
  * **Header**: `X-Host-Token: <host_token>`

* **`POST /api/rooms/{room_id}/eliminate/{target_id}`**
  * **Description**: Force eliminates a specific player (Host only).
  * **Header**: `X-Host-Token: <host_token>`

* **`GET /api/rooms/{room_id}/state`**
  * **Description**: Returns public room state and player list.

* **`POST /api/rooms/{room_id}/reset`**
  * **Description**: Resets game for a new round (Host only).
  * **Query Params**: `keep_players=true`
  * **Header**: `X-Host-Token: <host_token>`

---

## WebSocket Real-Time Sync

* **`WS /api/rooms/{room_id}/ws`**
  * **Description**: Establishes a real-time WebSocket connection for room state broadcasting.
  * **Events Broadcasted**: Player joins, settings updates, game start, vote submissions, round eliminations, and game over results.
