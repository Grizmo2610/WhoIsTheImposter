# Changelog

All notable changes to **Who Is The Imposter?** will be documented in this file.

## [2.0.0] - 2026-08-10

### Added

- Unified Vite + TypeScript frontend for Web/PWA and Capacitor Android.
- Pure game/state, role, vote, and win-condition engines.
- Bundled offline word repository plus auxiliary topic mapping.
- Versioned local snapshots, legacy migration, and full-phase resume.
- Installable PWA manifest and generated Workbox precache service worker.
- Hold-to-reveal privacy flow, Capacitor lifecycle handling, haptics, and Android `FLAG_SECURE`.
- Dark Mystery + Party Pop component system and responsive portrait/landscape layouts.
- Vitest unit suite and Playwright gameplay/offline/security specifications.

### Fixed

- Removed backend calls from the local gameplay critical path.
- Prevented player-name XSS by normalizing input and rendering user text through DOM text nodes.
- Restored elimination details and the correct continuation action after reload.
- Blocked game start until the bundled word repository is ready.
- Made different-topic selection use real topic metadata instead of a different array index.
- Removed double-scrolling and restored browser zoom/accessibility semantics.

### Security

- Secrets leave the active DOM/accessibility tree whenever hidden.
- Blur, visibility, pointer cancel, and native background lifecycle immediately hide secrets.
- Android screenshots, screen recording, recent-app previews, and app-data backup are restricted.
- Audited dependencies; the remaining `tar` finding is isolated to Capacitor CLI 6 and requires the separately scoped Capacitor major upgrade.

## [0.4.0-beta.2] - 2026-08-10

### Added

- **Hoàn thiện ứng dụng Android (Capacitor):** Bổ sung mã nguồn dự án `AndroidApp/`, script build tự động, cấu hình Capacitor, bộ icon đa kích thước và đồng bộ asset để đóng gói ứng dụng Android (`.apk`).
- **Mở rộng kho từ vựng:** Bổ sung nhiều cặp từ và chủ đề mới (`Mối quan hệ & Xã hội`, `Sự kiện & Đời sống`, `Thương hiệu & Tiện ích`, phân loại chi tiết Du lịch Việt Nam / Thế giới) vào `words.csv`.

### Changed

- **Cải tiến công cụ xuất dữ liệu:** Cập nhật script `export_word_pairs.py` hỗ trợ cấu hình mã hóa UTF-8 cho stdout.

## [0.4.0-beta] - 2026-08-08

### Added

- **Hỗ trợ ứng dụng Android (Capacitor):** Tích hợp Apache Capacitor để đóng gói trò chơi thành ứng dụng Android (`.apk`), mang lại trải nghiệm cài đặt trực tiếp trên thiết bị di động.
- **Đồng bộ từ cho nhiều Imposter:** Nâng cấp `LocalEngine` (`api.js`) đảm bảo khi có nhiều kẻ giả mạo trong ván đấu (ở cả chế độ cùng chủ đề lẫn khác chủ đề `different_topic`), tất cả các Imposter đều nhận chung một từ thay vì ngẫu nhiên độc lập.

## [0.3.2-beta.2] - 2026-08-08

### Added

- **Khôi phục ván chơi (Resume Game):** Tự động lưu tiến trình ván đấu vào `localStorage` giúp người chơi tiếp tục ván cũ nếu vô tình F5 hoặc đóng trình duyệt.
- **Chế độ chạy ngoại tuyến (Offline Fallback):** Cho phép client tự tính toán kết quả loại người chơi dựa trên dữ liệu đã cache nếu backend gặp sự cố mất kết nối giữa ván.
- **Ghi nhớ tên người chơi:** Tự động lưu danh sách tên người chơi gần nhất giúp tiết kiệm thời gian nhập liệu ở các ván tiếp theo.
- **Tùy chọn tiết lộ vai trò:** Bổ sung cấu hình `reveal_role_on_elimination` cho phép bật/tắt hiển thị vai trò (Dân thường / Kẻ giấu mặt) khi loại người chơi.

### Changed

- **Đồng bộ Imposter:** Đảm bảo khi có từ 2 kẻ giấu mặt trở lên trong phòng, tất cả sẽ nhận chung một từ hoặc gợi ý thay vì random độc lập.
- **Bảo mật từ bí mật:** Đảm bảo từ bí mật tuyệt đối không bị lộ giữa ván dù chế độ hiển thị vai trò khi bị loại đang bật hay tắt (chỉ lộ khi ván kết thúc hoàn toàn).
- **Quản lý URL phòng:** Cập nhật đồng bộ `roomId` lên thanh địa chỉ (`?room=...`) để dễ dàng chia sẻ hoặc theo dõi.

## [0.3.2-beta.1] - 2026-08-07

### Changed

- Cập nhật logo, favicon, ảnh chụp màn hình và demo link.
- Chỉnh giao diện và một số cải tiến nhỏ.
- Chỉnh sửa tài liệu và update `license` 

## [0.3.1]

### Changed

- Tối ưu hiệu năng ứng dụng.
- Cải thiện đồng bộ WebSocket.

### Fixed

- Sửa lỗi xử lý trạng thái phòng.
- Sửa lỗi phân phối từ bí mật.

## [0.3.0]

### Added

- Chuyển sang Cloudflare D1 (SQLite) và bổ sung công cụ quản lý `manage_words.py`.

## [0.2.0]

### Added

- Chuyển từ static website sang web app với FastAPI.
- Lưu trữ dữ liệu cục bộ bằng CSV.

## [0.1.0]

### Added

- Phiên bản static website thuần HTML/CSS/JavaScript.
