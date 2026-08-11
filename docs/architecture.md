# Kiến trúc ứng dụng

Repository này duy trì **hai cấu trúc mã nguồn chính** phục vụ các cách tiếp cận khác nhau:

## 1. Mô hình Frontend Hiện đại & Offline-first (`src/`, Vite + TypeScript, PWA, Capacitor)

`src/` là mã nguồn frontend SPA hiện đại được build bằng Vite (`dist/`), deploy làm Web/PWA và đóng gói cho Android qua Capacitor.

```text
UI DOM
  ↓ action / render(state)
AppController
  ↓
GameEngine ─── WordRepository
  ↓ snapshot
GameStorage ─── migration
```

### Game engine
`src/core/` không import DOM, localStorage hay Capacitor. `GameEngine` sở hữu state machine:

```text
setup → reveal ⇄ pass → discussion → vote → elimination
                              ↑                   │
                              └───────────────────┘
                                                  ↓
                                                result
```

`GameState` là nguồn sự thật duy nhất cho UI. Nó lưu phase, cấu hình, player/role/secret, reveal progress, round, vote, last elimination, game-over và winner. Mọi mutation trả về một snapshot clone để controller lưu ngay.

### Storage và resume
Key hiện tại là `who-is-the-imposter:game:v2`. Loader:
1. Parse JSON trong `try/catch`.
2. Kiểm tra version/shape.
3. Migrate snapshot cũ `imposter_game_state_v1` nếu có thể.
4. Khôi phục engine từ snapshot đã validate.
5. Render hoàn toàn từ phase/state, không suy luận từ text/button DOM.

Elimination result là một phần của state, vì vậy reload vẫn giữ tên, avatar, phiếu, role, winner và CTA tiếp theo.

### Offline/PWA & Bảo mật
- Kho từ và topic map là JSON import tĩnh. `vite-plugin-pwa` sinh Workbox service worker và precache mọi bundle/asset local. Không có REST call trong gameplay cốt lõi.
- Input validation (`src/security/input-validator.ts`), output an toàn qua text nodes (`textContent`), PrivacyManager che secret khi blur/background, và Android `FLAG_SECURE`.

---

## 2. Mô hình Full-stack Cổ điển (`backend/` & `frontend/`)

Bao gồm dịch vụ FastAPI và giao diện tĩnh độc lập:
- **`backend/`**: Ứng dụng Python FastAPI xử lý WebSocket thời gian thực, quản lý từ vựng qua CLI (`manage_words.py`), hỗ trợ đa nguồn lưu trữ (Local CSV, Cloudflare R2, Cloudflare D1 SQLite).
- **`frontend/`**: Giao diện client thuần tĩnh (HTML, CSS, JS) dùng cho mô hình chạy qua server HTTP cơ bản.
