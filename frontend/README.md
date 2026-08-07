# 🎨 Who Is The Imposter? — Frontend

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

The frontend client for **Who Is The Imposter?**, providing a responsive, modern UI/UX supporting both classic single-device pass-and-play and multi-device real-time gameplay connected to the FastAPI backend.

---

## 🗂️ Project Structure

```text
frontend/
├── index.html       # Main single-page application markup & UI views
├── styles.css       # Modern responsive styling, animations, and canvas UI
├── script.js        # Core client-side game state machine & pass-and-play logic
├── api.js           # REST & WebSocket API client wrapper for FastAPI backend
└── README.md
```

---

## 🚀 Running Frontend Locally

### Option 1: Standalone (Pass-and-Play)
Open `index.html` directly in any modern browser or via a local static server:
```bash
python -m http.server 5500
```
Then visit `http://localhost:5500`.

### Option 2: Connected to Backend
1. Ensure the FastAPI backend is running on `http://127.0.0.1:8000` (see `../backend/README.md`).
2. Serve frontend via `http.server` or live server.
3. The `api.js` client automatically communicates with the backend for room creation, player registration, secret fetching, and real-time WebSocket updates.
