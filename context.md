# Project Context: Ai là kẻ giả danh

Đây là game suy luận xã hội offline truyền tay. Runtime được hỗ trợ duy nhất là Vite + TypeScript trong `src/`, build thành Web/PWA và Capacitor Android.

## Invariants

- Không cần backend, phòng online hay network cho gameplay.
- `src/data/vocabulary_database.json` là word database runtime duy nhất.
- Mọi lọc topic và random word nằm trong module TypeScript thuần, không nằm trong UI.
- GameState lưu kết quả đã random để resume không cấp lại role/từ.
- Web/PWA và Android dùng cùng `dist/`, database và game engine.
