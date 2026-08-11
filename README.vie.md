# Who Is The Imposter?

Game suy luận xã hội truyền tay, ưu tiên offline, dùng chung một mã nguồn cho Web, PWA và Android. Toàn bộ gameplay cốt lõi chạy trên thiết bị: không cần tài khoản, phòng online hay kết nối Internet sau khi ứng dụng đã được cài/cache.

## Điểm chính

- Một frontend Vite + TypeScript dùng chung cho Web/PWA và Capacitor Android.
- Kho từ tiếng Việt được bundle, có trạng thái loading/ready/error rõ ràng.
- Game engine thuần, tách khỏi DOM, storage và API nền tảng.
- State có version và khôi phục đúng mọi phase, gồm cả màn kết quả loại người.
- Tên người chơi chỉ render bằng text node, không parse HTML do người dùng nhập.
- Giữ để xem bí mật; tự che khi thả tay, blur, đổi tab hoặc app xuống nền; Android bật `FLAG_SECURE`.
- Giao diện Dark Mystery + Party Pop, mobile-first, có layout landscape, keyboard, focus trap, reduced motion và touch target tối thiểu 44px.
- Vitest cho logic cốt lõi và đặc tả Playwright cho gameplay, resume, XSS, offline.

## Kiến trúc

```text
src/                         mã nguồn ứng dụng dùng chung
  core/                      luật chơi và state machine thuần
  data/                      WordRepository + dữ liệu JSON bundle
  security/                  validation và privacy lifecycle
  storage/                   lưu state có version và migration
  ui/                        các màn DOM và component tái sử dụng
  styles/                    design token và responsive layout
public/                      manifest PWA, icon, asset local
tests/unit/                  Vitest không phụ thuộc browser
tests/e2e/                   đặc tả Playwright
android/                     chỉ là Capacitor Android wrapper
backend/                     FastAPI tùy chọn/di sản, không thuộc gameplay local
dist/                        output Web/PWA và Capacitor
```

Luồng production duy nhất:

```text
src → Vite build → dist → Web/PWA + Capacitor Android
```

Backend FastAPI không còn nằm trên critical path của tạo ván, chia vai, lấy từ, vote, resume hoặc xác định thắng thua.

## Phát triển

Yêu cầu Node.js 20.19+ hoặc 22.12+ và npm.

```sh
npm install
npm run dev
```

Kiểm tra tĩnh và build production:

```sh
npm run typecheck
npm run test
npm run build
```

Test browser E2E được tách riêng:

```sh
npm run test:e2e
```

## Android

Đợt refactor này giữ Capacitor ở major 6. Native wrapper được theo dõi trong `android/`.

```sh
npm run cap:sync
npm run cap:open:android
```

`MainActivity` bật `FLAG_SECURE`, ngăn secret xuất hiện trong screenshot, screen recording và Recent Apps. Android backup bị tắt vì state local có thể chứa vai trò/từ bí mật.

Không có dependency, native project hay pipeline iOS trong phiên bản này.

## Offline và dữ liệu

`src/data/word_pairs.json` giữ nguyên schema object cũ. `src/data/word-topic-map.json` là metadata phụ sinh từ `backend/data/words.csv`, dùng để chế độ “khác chủ đề” thật sự chọn một topic khác. Nếu metadata không đủ, repository ghi rõ `fallback` deterministic thay vì giả định khác index là khác chủ đề.

Vite PWA/Workbox precache application shell, bundle, CSS, dữ liệu từ, icon và asset local. Kho từ được import vào bundle nên không có runtime fetch/race condition trước khi bắt đầu ván.

## Bảo mật và quyền riêng tư

- Tên người chơi được normalize còn 1–20 ký tự, bỏ control character và render bằng `textContent`/text node.
- Khi bị che, secret bị loại khỏi DOM active và accessibility tree.
- `pointerup`, `pointercancel`, lost pointer capture, blur, visibility change và Capacitor background event đều che secret.
- State lưu trên chính thiết bị và có chứa secret để resume offline chính xác.

Xem thêm [docs/architecture.md](docs/architecture.md), [docs/wordbank.md](docs/wordbank.md) và [CHANGELOG.md](CHANGELOG.md).

## Giấy phép

MIT — xem [LICENSE.txt](LICENSE.txt).
