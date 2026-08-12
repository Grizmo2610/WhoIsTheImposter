# Ai là kẻ giả danh

Game suy luận xã hội truyền tay, ưu tiên offline, dùng chung một mã nguồn cho Web, PWA và Android. Toàn bộ gameplay cốt lõi chạy trên thiết bị: không cần tài khoản, phòng online hay kết nối Internet sau khi ứng dụng đã được cài/cache.

## Điểm chính

- Một frontend Vite + TypeScript dùng chung cho Web/PWA và Capacitor Android.
- Kho từ tiếng Việt được bundle, có trạng thái loading/ready/error rõ ràng.
- Game engine thuần, tách khỏi DOM, storage và API nền tảng.
- State có version và khôi phục đúng mọi phase, gồm cả màn kết quả loại người.
- Tên người chơi chỉ render bằng text node, không parse HTML do người dùng nhập.
- Lá bài bí mật 3D lật khi giữ, dùng artwork tỉ lệ 2:3; chế độ Không có từ dùng mặt đỏ riêng để Kẻ giả danh nhận biết vai trò cùng gợi ý.
- Bí mật tự che khi thả tay, blur, đổi tab hoặc app xuống nền; Android bật `FLAG_SECURE`.
- Nút Back hệ thống đóng hộp thoại, quay lại từng bước thiết lập và hỏi xác nhận trước khi tạm dừng ván đang chơi.
- Giao diện Ghost-Flame Mystery dùng token, nền lửa ma CSS responsive, nút dạng thẻ manh mối viền cyan, màu nhận diện người chơi ổn định, reduced motion và touch target Android tối thiểu 48px.
- Logo ma tiếng Việt do người dùng cung cấp là điểm sáng chính của Home; runtime không còn phụ thuộc ảnh nền toàn màn hình có tỉ lệ cố định.
- Vitest cho logic cốt lõi và đặc tả Playwright cho gameplay, resume, XSS, offline.

## Kiến trúc

```text
src/                         mã nguồn ứng dụng dùng chung
  core/                      luật chơi và state machine thuần
  data/                      một JSON duy nhất + validator/selector
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

UI dùng chung cũng xử lý riêng trải nghiệm Android: bàn phím mềm làm co vùng nội dung thay vì che form, focus được giữ ổn định khi đổi tùy chọn, hover chỉ áp dụng cho thiết bị thật sự có chuột, và thao tác giữ để xem có rung nhẹ. Thứ tự của nút Back là: đóng hộp thoại đang mở, từ cài đặt về danh sách người chơi, từ danh sách về trang chủ, hỏi lưu trước khi rời ván đang chạy, rồi thoát ứng dụng khi đang ở trang chủ.

Hẹn giờ đối chứng tùy chọn dùng 45 giây cho mỗi người còn sống, lưu deadline cùng ván đang chơi và rung một lần khi đếm về 0:00.

Build APK debug mà không chạy test browser:

```sh
npm run typecheck
npm run test
npm run cap:sync
cd android
./gradlew assembleDebug
```

APK được tạo tại `android/app/build/outputs/apk/debug/app-debug.apk`.

Không có dependency, native project hay pipeline iOS trong phiên bản này.

## Offline và dữ liệu

`src/data/vocabulary_database.json` là nguồn từ runtime duy nhất và giữ đúng schema `id / topics / hint / related`. Validator bundle loại record sai schema; selector lọc OR theo 8 topic dùng chung và khóa cấu hình không đủ candidate, tuyệt đối không fallback ra ngoài topic người dùng chọn.

Vite PWA/Workbox precache application shell, bundle, CSS, dữ liệu từ, icon và asset local. Kho từ được import vào bundle nên không có runtime fetch/race condition trước khi bắt đầu ván.

## Bảo mật và quyền riêng tư

- Tên người chơi được normalize còn 1–20 ký tự, bỏ control character và render bằng `textContent`/text node.
- Khi bị che, secret bị loại khỏi DOM active và accessibility tree.
- `pointerup`, `pointercancel`, lost pointer capture, blur, visibility change và Capacitor background event đều che secret.
- State lưu trên chính thiết bị và có chứa secret để resume offline chính xác.

Xem thêm [docs/architecture.md](docs/architecture.md), [docs/wordbank.md](docs/wordbank.md), [design system Neon Noir Party](design-system/who-is-the-imposter/MASTER.md) và [CHANGELOG.md](CHANGELOG.md).

## Cách chơi

1. Thêm 3–12 người chơi, chọn số Kẻ giả danh, chế độ từ và một hoặc nhiều chủ đề.
2. Chuyển thiết bị cho đúng người được gọi tên. Người đó nhấn giữ lá bài để lật, ghi nhớ từ hoặc gợi ý, thả tay để che rồi bấm **Chuyển máy cho người tiếp theo**. Ở người cuối cùng, nút này đổi thành **Bắt đầu vòng đối chứng**. Màn chia từ không ghi người nhận là Dân thường hay Kẻ giả danh.
3. Khi mọi người đã xem xong, lần lượt mô tả gián tiếp. Không nói, đánh vần hoặc dịch thẳng từ bí mật.
4. Cả nhóm thảo luận, đồng thuận chọn một người còn sống và xác nhận loại. Luồng offline hiện tại dùng một quyết định chung, không thu lá phiếu riêng của từng người.
5. Ở chế độ nhiều vòng, Dân thường thắng khi không còn Kẻ giả danh; Kẻ giả danh thắng khi số người của họ bằng hoặc nhiều hơn số Dân thường còn sống. Nếu tắt nhiều vòng, Dân thường chỉ thắng khi lần loại đầu tiên chọn đúng Kẻ giả danh.

Ba chế độ chia thông tin là **Từ tương tự**, **Không có từ** và **Khác nhóm**. Xem [hướng dẫn chơi đầy đủ](docs/how-to-play.md) để biết chi tiết luật, quyền riêng tư, khôi phục ván và mẹo chơi công bằng.

## Liên kết dự án

- [Kho mã nguồn](https://github.com/Grizmo2610/WhoIsTheImposter)
- [Danh sách issue](https://github.com/Grizmo2610/WhoIsTheImposter/issues)
- [Báo lỗi](https://github.com/Grizmo2610/WhoIsTheImposter/issues/new?labels=bug&template=bug-report.md)
- [Đề xuất tính năng](https://github.com/Grizmo2610/WhoIsTheImposter/issues/new?labels=enhancement&template=feature-request.md)

## Công cụ full-stack/di sản tùy chọn

Mã online/full-stack lịch sử không thuộc runtime được hỗ trợ. Nguồn có thẩm quyền là engine TypeScript local trong `src/core/` cùng database JSON duy nhất trong `src/data/`.

## Lộ trình

- [x] Web/PWA offline chơi chung một thiết bị.
- [x] Capacitor wrapper dùng chung cho Android.
- [x] Kho từ bundle và resume offline có version.
- [x] Luồng chia từ lật thẻ an toàn; chỉ chế độ Không có từ xác nhận vai trò Kẻ giả danh bằng mặt thẻ đỏ.
- [ ] Native wrapper và pipeline phát hành iOS.
- [ ] Điểm số và thống kê tùy chọn nhưng vẫn bảo đảm quyền riêng tư offline.

Thảo luận lộ trình và công việc đã được chấp nhận được theo dõi tại [GitHub Issues](https://github.com/Grizmo2610/WhoIsTheImposter/issues).

## Đóng góp

1. Fork hoặc clone dự án.
2. Tạo nhánh riêng như `feature/mo-ta-ngan` hoặc `fix/mo-ta-ngan`; không sửa trực tiếp trên `main`.
3. Giữ nguyên schema kho từ và đặt luật gameplay trong pure core, không sao chép luật sang UI hoặc native code.
4. Chạy `npm run typecheck`, `npm run test` và `npm run build` cho thay đổi liên quan. Browser E2E là bước thủ công riêng khi được yêu cầu.
5. Commit thay đổi đúng phạm vi, push nhánh và mở pull request vào `main`. Không force-push hoặc tự động merge.

Mọi hành vi người dùng nhìn thấy cần được cập nhật ở cả hai README, hướng dẫn chơi nếu luật thay đổi và `CHANGELOG.md`.

## Liên hệ và ghi nhận

Người duy trì: [hoangtuantu893@gmail.com](mailto:hoangtuantu893@gmail.com).

Dự án sử dụng Vite, TypeScript, Capacitor, Vitest, đặc tả Playwright và các gói mã nguồn mở do cộng đồng duy trì. Xem lịch sử repository và contributor graph để biết đóng góp cụ thể.

Space Grotesk và Plus Jakarta Sans được bundle local để dùng offline theo SIL Open Font License; nội dung giấy phép tương ứng nằm trong `public/fonts/`.

## Giấy phép

MIT — xem [LICENSE.txt](LICENSE.txt).
