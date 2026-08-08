# Changelog

All notable changes to **Who Is The Imposter?** will be documented in this file.

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