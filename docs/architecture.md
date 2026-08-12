# Kiến trúc ứng dụng

## Runtime duy nhất

`src/` là application source dùng chung. Vite tạo `dist/`; cùng output này được deploy thành Web/PWA và được Capacitor copy vào `android/`.

```text
vocabulary_database.json
  ↓ validate
WordGroup[] ──→ word-selector.ts
                   ↓ kết quả đã random
UI DOM → AppController → GameEngine → GameState v3 → GameStorage
                                     ↓
                              Web/PWA + Android
```

Game không gọi backend để lấy từ. `src/data/vocabulary_database.json` là database runtime duy nhất, được import vào bundle thay vì tải bằng API.

## Data modules

- `word-topics.ts`: 8 topic và `WordTopic` dùng chung.
- `random.ts`: `sampleOne` và `sampleUnique` không mutate input.
- `word-database.ts`: schema types, validator và bundled loader.
- `word-selector.ts`: lọc OR theo topic, availability validation và ba mode chọn từ độc lập DOM.

## Game engine và state

`src/core/` không import DOM, localStorage hay Capacitor. `GameEngine.start()` nhận database đã validate và gọi selector đúng một lần. State v3 lưu `config.selectedTopics`, kết quả `wordSelection`, từng secret đã cấp, `sourceGroupIds` và deadline đối chứng; restore dùng snapshot này, không random lại.

Timer đối chứng tính 45 giây cho mỗi người còn sống. Engine lưu mốc `discussionEndsAt` tuyệt đối khi bắt đầu vòng, nên đóng/mở lại ứng dụng không làm thời gian quay về đầu. UI chỉ trình bày countdown; rung hết giờ nằm tại adapter Capacitor.

```text
setup → reveal → discussion → vote → elimination
                    ↑                   │
                    └───────────────────┘
                                        ↓
                                      result
```

Phase `pass` chỉ còn để migration snapshot v2; UI mới chuyển trực tiếp từ lá bài hiện tại sang lá bài úp tiếp theo.

## Storage và resume

Key hiện tại là `who-is-the-imposter:game:v3`. Loader cũng đọc v2 và snapshot legacy, chuẩn hóa chúng sang v3 rồi lưu lại. Resume giữ nguyên topic, role, từ/hint và group result đã chọn.

## Offline/PWA và Android

Workbox precache application shell, compiled bundle, JSON đã import, font, icon và asset local. `capacitor.config.ts` dùng `webDir: "dist"`; native Android không có logic chọn từ riêng.

## Bảo mật và privacy

- Tên người chơi được normalize/validate rồi render bằng text node.
- Secret bị loại khỏi DOM/accessibility tree khi úp.
- Blur, visibility change, pointer cancel và app background đều che secret.
- Android bật `FLAG_SECURE` và tắt backup.

## Kiểm thử

Vitest kiểm tra validator database, lọc topic, random unique, ba mode, role/vote/win và migration/resume. Playwright vẫn là đặc tả E2E riêng và không nằm trong lần kiểm tra tự động của đợt refactor này.
