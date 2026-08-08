<!-- Improved compatibility of back to top link -->

<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![project\_license][license-shield]][license-url]

<br />
<div align="center">
  <a href="https://github.com/Grizmo2610/WhoIsTheImposter">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Ai Là Người Giả Mạo?</h3>

  <p align="center">
    Trò chơi truyền tay & thời gian thực — tìm người giả mạo trong bè bạn
    <br />
    <a href="docs/architecture.md"><strong>Khám phá tài liệu »</strong></a>
    <br />
    <br />
    <a href="https://whoistheimposter.hoangtuantu893.workers.dev/">Xem Demo</a>
    &middot;
    <a href="https://github.com/Grizmo2610/WhoIsTheImposter/issues/new?labels=bug&template=bug-report.md">Báo Lỗi</a>
    &middot;
    <a href="https://github.com/Grizmo2610/WhoIsTheImposter/issues/new?labels=enhancement&template=feature-request.md">Yêu Cầu Tính Năng</a>
  </p>
</div>

---

## Giới Thiệu Dự Án

[![Product Name Screen Shot][product-screenshot]](https://whoistheimposter.hoangtuantu893.workers.dev/)

**Ai Là Người Giả Mạo?** (Who Is The Imposter?) là trò chơi tiệc tùng lấy cảm hứng từ các thể loại suy luận xã hội cổ điển (Mafia / Among Us). Người chơi lần lượt xem từ bí mật, thảo luận và bỏ phiếu để loại bỏ kẻ giả mạo trước khi chúng phá hoại cả nhóm.

Dự án hỗ trợ 2 chế độ linh hoạt:
1. **Truyền tay cổ điển (Chỉ Frontend)**: Chạy hoàn toàn ở phía client trên một thiết bị duy nhất — không cần cài đặt hay kết nối mạng.
2. **Backend thẩm quyền (FastAPI + WebSocket)**: Quản lý trạng thái trên server với cơ chế phân phối từ/vai trò bảo mật, đồng bộ thời gian thực đa thiết bị qua điện thoại, và hỗ trợ nhiều nguồn lưu trữ (Local CSV, Cloudflare R2, Cloudflare D1 SQLite).

### Tính Năng Nổi Bật

* **Đa chế độ chơi**: Truyền tay trên 1 máy hoặc chơi nhiều thiết bị trực tuyến qua WebSocket.
* **Cấu hình linh hoạt**: Số lượng người chơi (3–12), số lượng kẻ giả mạo, và hẹn giờ thảo luận với thanh tiến trình tròn.
* **Chế độ Kẻ Giả Mạo**: 
  * **Biết Mình Là Ai**: Kẻ giả mạo biết vai trò và nhận gợi ý liên quan để đánh lạc hướng.
  * **Ẩn Danh**: Kẻ giả mạo chỉ thấy từ tương tự từ của dân thường, không có dấu hiệu nhận biết.
* **Chống gian lận**: Tự động ẩn màn hình khi người chơi chuyển tab trình duyệt.
* **Kho từ vựng & Quản lý CLI**: Hơn 50 cặp từ tiếng Việt quản lý qua file CSV local, Cloudflare R2 hoặc Cloudflare D1 (`manage_words.py`).
* **Giao diện tương tác**: Hiệu ứng confetti chúc mừng chiến thắng và hỗ trợ chơi nhiều ván liên tục.

Quy trình:
Cài đặt → Nhập Tên → Truyền Máy → Xem Bí Mật → Thảo Luận → Bỏ Phiếu → Loại → Kết Quả

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Tài Liệu Dự Án

Khám phá tài liệu chi tiết của dự án:
* 🏛️ [Kiến Trúc Hệ Thống (Architecture)](docs/architecture.md)
* 📚 [Kho Từ Vựng & Quản Lý CLI (Word Bank)](docs/wordbank.md)
* 🔌 [Tham Khảo API & WebSocket (API Reference)](docs/api.md)
* 📋 [Nhật Ký Thay Đổi (Changelog)](CHANGELOG.md)

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Công Nghệ Sử Dụng

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/WebSocket-Realtime-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Cloudflare_R2-S3-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" />
  <img src="https://img.shields.io/badge/Cloudflare_D1-SQLite-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" />
</p>

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Bắt Đầu & Cài Đặt

### Điều Kiện Tiên Quyết

* Trình duyệt web hiện đại (Chrome, Firefox, Safari, Edge)
* Python 3.10+ (tùy chọn, chỉ cần thiết khi chạy FastAPI backend)

### 1. Sao Chép Kho Lưu Trữ

```sh
git clone https://github.com/Grizmo2610/WhoIsTheImposter.git
```

2. Mở thư mục dự án

```sh
cd WhoIsTheImposter
```

### 2. Lựa Chọn A: Chạy Frontend Thuần (Truyền tay)

Không cần cài đặt hay biên dịch. Chỉ cần mở file `index.html` trên trình duyệt:

* **Windows:** `start index.html` (hoặc nhấp đúp vào `index.html`)
* **macOS:** `open index.html`
* **Linux:** `xdg-open index.html`

### 3. Lựa Chọn B: Chạy Full-Stack (FastAPI Backend + Frontend)

Để chạy với trạng thái phía server an toàn và hỗ trợ WebSocket đa thiết bị:

* **Terminal 1 (Backend):**
  ```bash
  cd backend
  python -m venv .venv
  .venv\Scripts\activate.bat   # macOS/Linux: source .venv/bin/activate
  pip install -r requirements.txt
  cp .env.example .env
  uvicorn app.main:app --reload --port 8000
  ```

* **Terminal 2 (Frontend Static Server):**
  ```bash
  cd frontend
  python -m http.server 5500
  ```
  Sau đó mở `http://localhost:5500` trên trình duyệt của bạn.

* Xem chi tiết kiến trúc, các backend lưu trữ (Cloudflare R2/D1) và lệnh console quản lý từ vựng (`manage_words.py`) tại [backend/README.md](backend/README.md).
* Xem kiến trúc client frontend tại [frontend/README.md](frontend/README.md).

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Hướng Dẫn Sử Dụng

### Cách Chơi

1. **Cài đặt** — Cấu hình số người chơi, số người giả mạo, chế độ và hẹn giờ tùy chọn.
2. **Nhập Tên** — Nhập tên cho mỗi người chơi.
3. **Truyền Máy** — Truyền thiết bị cho người tiếp theo để xem từ bí mật.
4. **Xem Bí Mật** — Xem từ cá nhân một cách riêng tư (bảo vệ chống gian lận khi chuyển tab).
5. **Thảo Luận** — Mọi người thảo luận công khai trong thời gian quy định.
6. **Bỏ Phiếu** — Bỏ phiếu cho người bị nghi ngờ là kẻ giả mạo.
7. **Loại** — Tiết lộ vai trò dân thường hoặc kẻ giả mạo của người bị chọn.
8. **Kết Quả** — Trò chơi kết thúc khi loại hết kẻ giả mạo (dân thắng) hoặc kẻ giả mạo đông hơn.

### Kho Từ Vựng & Quản Lý CLI

Từ vựng được quản lý thông qua `WordRepository` (hỗ trợ Local CSV, Cloudflare R2 hoặc Cloudflare D1). Bạn có thể quản lý kho từ bằng công cụ dòng lệnh:
```bash
python backend/manage_words.py --backend local list
```

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Lộ Trình Phát Triển

* [x] Chế độ chơi truyền tay client-side
* [x] Backend thẩm quyền FastAPI kết hợp đồng bộ WebSocket real-time
* [x] Tích hợp lưu trữ Cloudflare R2 và Cloudflare D1 cho kho từ vựng
* [x] Công cụ dòng lệnh quản lý từ vựng (`manage_words.py`)
* [ ] Hỗ trợ đa ngôn ngữ (Tiếng Anh, Tiếng Nhật, Tiếng Hàn, v.v.)
* [ ] Hiệu ứng âm thanh và nhạc nền
* [ ] Gói từ vựng tùy chỉnh
* [ ] Mở rộng multiplayer trực tuyến (WebRTC / Cloud deployment)
* [x] Ứng dụng di động (Capacitor / PWA)
* [ ] Theo dõi điểm số và thống kê

Xem các [vấn đề mở](https://github.com/Grizmo2610/WhoIsTheImposter/issues)

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Đóng Góp

1. Fork dự án
2. Tạo nhánh tính năng (`git checkout -b feature/AmazingFeature`)
3. Commit thay đổi (`git commit -m 'Add some AmazingFeature'`)
4. Push lên nhánh (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

---

### Top Người Đóng Góp:

<a href="https://github.com/Grizmo2610/WhoIsTheImposter/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Grizmo2610/WhoIsTheImposter" />
</a>

---

## Giấy Phép

Phân phối theo Giấy Phép MIT. Xem [LICENSE.txt](LICENSE.txt) để biết thêm chi tiết.

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Liên Hệ

hoangtuantu - [hoangtuantu893@gmail.com](mailto:hoangtuantu893@gmail.com)

Liên kết dự án:
https://github.com/Grizmo2610/WhoIsTheImposter

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Lời Cảm Ơn

* Các định dạng trò chơi Among Us / Mafia / Werewolf
* Hệ sinh thái FastAPI & Python
* Cloudflare R2 & D1

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

[contributors-shield]: https://img.shields.io/github/contributors/Grizmo2610/WhoIsTheImposter.svg?style=for-the-badge
[contributors-url]: https://github.com/Grizmo2610/WhoIsTheImposter/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/Grizmo2610/WhoIsTheImposter.svg?style=for-the-badge
[forks-url]: https://github.com/Grizmo2610/WhoIsTheImposter/network/members
[stars-shield]: https://img.shields.io/github/stars/Grizmo2610/WhoIsTheImposter.svg?style=for-the-badge
[stars-url]: https://github.com/Grizmo2610/WhoIsTheImposter/stargazers
[issues-shield]: https://img.shields.io/github/issues/Grizmo2610/WhoIsTheImposter.svg?style=for-the-badge
[issues-url]: https://github.com/Grizmo2610/WhoIsTheImposter/issues
[license-shield]: https://img.shields.io/github/license/Grizmo2610/WhoIsTheImposter.svg?style=for-the-badge
[license-url]: https://github.com/Grizmo2610/WhoIsTheImposter/blob/main/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png
