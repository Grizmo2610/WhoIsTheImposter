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
setup → reveal ⇄ pass → discussion(handoff → clue round → open floor) → vote → elimination
                              ↑                   │
                              └───────────────────┘
                                                  ↓
                                                result
```

`GameState` v3 là nguồn sự thật duy nhất cho UI. Ngoài phase/role/secret, state lưu quản trò ngoài ván, stage thảo luận, speaker order, speaking queue, timer timestamp, consensus selection và lịch sử loại. Mọi mutation trả về một snapshot clone để controller lưu ngay.

### Storage và resume
Key hiện tại là `who-is-the-imposter:game:v3`. Loader:

1. Parse JSON trong `try/catch`.
2. Kiểm tra version/shape.
3. Migrate snapshot v2 hoặc `imposter_game_state_v1` nếu có thể; discussion v2 dùng timer paused an toàn.
4. Khôi phục engine từ snapshot đã validate.
5. Render hoàn toàn từ phase/state, không suy luận từ text/button DOM.

Elimination result/history là một phần của state, vì vậy reload vẫn giữ tên, avatar, phương thức chọn, role, winner và CTA tiếp theo. Consensus không sinh phiếu giả; `vote-engine` chỉ dành cho ballot có phiếu thật.

## Rendering UI

Mỗi màn có một `data-screen-key` ổn định theo view, phase, discussion stage và clue speaker. Khi key thay đổi, renderer dựng màn mới, cuộn về đầu, focus `<main>` và chạy animation chuyển cảnh một lần. Render lại với cùng key bảo toàn `scrollTop`, khôi phục control có cùng `data-focus-key` và không chạy animation.

Ticker thảo luận không gọi full render. Timer, cooldown, speaking queue và spotlight được patch trực tiếp qua các `data-live` hook trên DOM hiện tại; controller chỉ fallback sang full render khi phase, stage hoặc clue speaker thực sự thay đổi. Vì vậy snapshot vẫn lấy từ `GameState` nhưng cập nhật mỗi giây không thay thế `.screen`.

`GameState.endedEarly` là field additive của snapshot v3. Khi nhóm kết thúc sớm, engine chuyển thẳng sang `result`, giữ role/từ/lịch sử hiện có, đặt `winner` là `null` và không gọi điều kiện thắng. Snapshot v3 cũ thiếu field này được chuẩn hóa thành `false` khi load.

### Offline/PWA & Bảo mật
- Kho từ và topic map là JSON import tĩnh. `vite-plugin-pwa` sinh Workbox service worker và precache mọi bundle/asset local. Không có REST call trong gameplay cốt lõi.
- Input validation (`src/security/input-validator.ts`), output an toàn qua text nodes (`textContent`), PrivacyManager che secret khi blur/background, và Android `FLAG_SECURE`.

### Android

`capacitor.config.ts` dùng `webDir: "dist"`. `android/` chỉ chứa Capacitor shell, plugin App/Haptics và privacy flag trong `MainActivity`. Không có iOS trong scope.

### Kiểm thử

- `tests/unit`: role, imposter, vote, win condition, timer, migration và kho từ.
- `tests/e2e`: gameplay, quản trò, ổn định scroll/DOM, kết thúc sớm, XSS, resume và PWA offline.

Unit tests chạy độc lập browser. E2E chạy bằng `npm run test:e2e`.

---

## 2. Mô hình Full-stack Cổ điển (`backend/` & `frontend/`)

Bao gồm dịch vụ FastAPI và giao diện tĩnh độc lập:

- **`backend/`**: Ứng dụng Python FastAPI xử lý WebSocket thời gian thực, quản lý từ vựng qua CLI (`manage_words.py`), hỗ trợ đa nguồn lưu trữ (Local CSV, Cloudflare R2, Cloudflare D1 SQLite).
- **`frontend/`**: Giao diện client thuần tĩnh (HTML, CSS, JS) dùng cho mô hình chạy qua server HTTP cơ bản.
