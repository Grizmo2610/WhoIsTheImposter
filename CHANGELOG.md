# Changelog

All notable changes to **Who Is The Imposter?** will be documented in this file.

## [Unreleased]

### Changed

- Replaced the secret-card back artwork and added a dedicated red Imposter face for the no-word mode, with a yellow “Gợi ý:” label and white hint content.
- Removed decorative lower-right corner brackets from game cards and panels.

### Added

- A single bundled `vocabulary_database.json`, eight shared topic constants, strict record validation, non-mutating random utilities, and DOM-independent selection logic for all three word modes.
- Compact multi-select topic chips in Setup 2/2 with automatic “Tất cả” state and inline candidate validation.
- Unit coverage for topic OR filtering, unique multi-imposter assignment, same-topic different-group pairing, invalid database records, and resume without rerandomization.
- Authored transparent 2:3 secret-card artwork for both hidden and revealed faces.
- A responsive code-driven ghost-flame atmosphere with six spectral wisps, sparse particles, calm central safe zones, and reduced-motion fallbacks.
- Shared mystery button, clue card, secret evidence card, and suspect card visual contracts for the ghost/detective theme.
- An original spooky-fun branding kit with a transparent Vietnamese ghost hero logo, a cinematic Home background, and a restrained gameplay background.
- A token-driven Neon Noir Party mini design system covering color, typography, spacing, radii, borders, elevation, motion, responsive layout, and player identity.
- Locally bundled Space Grotesk and Plus Jakarta Sans variable fonts with their SIL Open Font License texts, included in the PWA precache for fully offline typography.
- Reusable danger actions and visible check-mark selection feedback for destructive/resolution flows.
- A complete Vietnamese gameplay guide covering role-neutral card dealing, all three word modes, consensus elimination, win conditions, resume, privacy, and fair-play tips.
- Android system Back handling for dialogs, setup navigation, safe game pausing, and home-screen exit.
- Light haptic and accessible pressed-state feedback for hold-to-reveal.
- Party Noir visual system with electric-purple layers, poster-red identity, yellow tactile CTAs, geometric motifs, and an offline system-font stack.
- Physical 3D hold-to-flip secret card with pointer, touch, keyboard, reduced-motion, and privacy lifecycle support.
- Unit coverage proving the word-deal view model never exposes a player's role.

### Changed

- Home hides the new-game action while an unfinished game exists, centers the resume flow, and gives the discard action a clearer red glow.
- Setup 1/2 centers its continuation action on desktop; advanced settings copy no longer includes a decorative chevron.
- The optional confrontation timer now scales at 45 seconds per surviving player, persists an absolute deadline across resume, counts down to `0:00`, and triggers one native vibration when time expires.
- Ghost-flame wisps and particles move slightly faster while preserving the reduced-motion fallback.
- Game state v3 now persists selected topics, assigned contents, hints, and source group ids; v2/legacy snapshots migrate without rerandomizing existing secrets.
- Web/PWA and Capacitor Android now import the same local JSON and TypeScript selection implementation with no runtime word API or fallback outside selected topics.
- Renamed the installed Web/PWA and Android app to `Ai là kẻ giả danh` and regenerated every launcher icon from the supplied ghost logo.
- New games now start with exactly four players; replay returns to player setup, while an explicit resume still restores the saved roster.
- Reveal handoff, confrontation, vote, elimination, and final-result copy now use the shorter flow without persistent “Đã xem” or vote-count labels.
- Secret words use a larger yellow Plus Jakarta Sans treatment, and Android reveal content is centered lower in the safe dynamic viewport.
- Replaced the Home lockup with the newly optimized transparent PNG and added distinct responsive sizing for Web and Android.
- Renamed the Home help action and dialog to `Luật chơi`.
- Secret words now use the bold Vietnamese-capable display face with length-aware scaling, safer line height, and a restrained spectral depth glow; the card preserves its artwork at every breakpoint.
- Android gameplay screens now fit one dynamic viewport without scrolling, while setup screens retain scrolling for variable-length forms.
- Gameplay buttons are compact, borderless surfaces without decorative corner marks or sweep effects.
- Home now uses the supplied ghost logo, while all fixed-ratio illustrated backgrounds have been replaced by lightweight CSS/DOM atmosphere layers.
- Primary CTAs now use a dark cyan/violet spectral edge instead of a yellow fill; secondary and danger actions follow clue-card semantics.
- Home, setup, and gameplay now share a responsive near-black ghost-flame atmosphere with calmer central safe zones tuned per screen context.
- The UI now uses one Dark Mystery + Party Pop visual layer instead of stacked theme overrides, with subtle borders, navy surfaces, violet focus, and yellow reserved for primary actions.
- Reveal now follows the strict viewer → secret → gesture → confirmation hierarchy, omits round/alive metadata, scales secret text by length without clipping Vietnamese diacritics, and enables confirmation after the first completed reveal.
- Home, discussion, vote, elimination, result, dialogs, mobile landscape, safe areas, and touch targets now follow the shared mini design system.
- Discarding a resumable game now requires a danger confirmation; vote confirmation uses medium haptic feedback.
- README documentation now follows the repository contribution rules while accurately describing the current offline-first architecture and gameplay flow.
- The in-app guide now explains hold-to-flip dealing without role disclosure and the shared group elimination decision.
- Soft-keyboard viewport resizing and input scroll margins prevent the sticky action from covering player-name fields.
- Same-screen updates preserve interactive focus, while real screen transitions announce the new semantic `main` to assistive technology.
- Touch devices no longer retain mouse hover styling; secret surfaces also suppress selection and long-press callouts.
- The word-deal screen now reveals only the assigned word or hint; civilian/imposter labels are reserved for configured elimination and final-result screens.
- Structural controls use a consistent inline SVG icon family instead of text glyphs.

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
