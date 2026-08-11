# Kiến trúc ứng dụng

## Nguồn duy nhất

`src/` là frontend duy nhất. Vite tạo `dist/`; cùng output này được deploy thành Web/PWA và copy vào native Android bằng Capacitor. Native code không chứa bản gameplay riêng.

```text
UI DOM
  ↓ action / render(state)
AppController
  ↓
GameEngine ─── WordRepository
  ↓ snapshot
GameStorage ─── migration
```

## Game engine

`src/core/` không import DOM, localStorage hay Capacitor. `GameEngine` sở hữu state machine:

```text
setup → reveal ⇄ pass → discussion → vote → elimination
                              ↑                   │
                              └───────────────────┘
                                                  ↓
                                                result
```

`GameState` là nguồn sự thật duy nhất cho UI. Nó lưu phase, cấu hình, player/role/secret, reveal progress, round, vote, last elimination, game-over và winner. Mọi mutation trả về một snapshot clone để controller lưu ngay.

## Storage và resume

Key hiện tại là `who-is-the-imposter:game:v2`. Loader:

1. Parse JSON trong `try/catch`.
2. Kiểm tra version/shape.
3. Migrate snapshot cũ `imposter_game_state_v1` nếu có thể.
4. Khôi phục engine từ snapshot đã validate.
5. Render hoàn toàn từ phase/state, không suy luận từ text/button DOM.

Elimination result là một phần của state, vì vậy reload vẫn giữ tên, avatar, phiếu, role, winner và CTA tiếp theo.

## Offline/PWA

Kho từ và topic map là JSON import tĩnh. `vite-plugin-pwa` sinh Workbox service worker và precache mọi bundle/asset local. Không có REST call trong gameplay cốt lõi.

Backend FastAPI trong `backend/` vẫn tồn tại như hệ thống tùy chọn cho thử nghiệm online sau này, nhưng frontend production không import client API hay phụ thuộc backend.

## Boundary bảo mật

- Input: normalize/validate tên tại `src/security/input-validator.ts`.
- Output: component tạo DOM node và gán text; không parse chuỗi người dùng bằng `innerHTML`.
- Privacy: `PrivacyManager` che secret khi blur, document hidden hoặc Capacitor app inactive.
- Native Android: `FLAG_SECURE` và `allowBackup=false`.
- Accessibility: hidden secret được thay bằng placeholder có `aria-hidden`, không chỉ đổi opacity.

## Android

`capacitor.config.ts` dùng `webDir: "dist"`. `android/` chỉ chứa shell do Capacitor tạo, plugin App/Haptics và privacy flag trong `MainActivity`. Không có iOS trong scope.

## Kiểm thử

- `tests/unit`: role, số imposter, vote, win, round, resume, migration, kho từ rỗng, các word mode và validation.
- `tests/e2e`: đặc tả flow chính, XSS, elimination resume và PWA offline.

Unit tests chạy độc lập browser. E2E được gọi riêng bằng `npm run test:e2e`.
