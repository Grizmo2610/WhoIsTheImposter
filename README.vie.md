<!-- Improved compatibility of back to top link -->

<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![project\_license][license-shield]][license-url]

<br />
<div align="center">
  <a href="https://github.com/hoangtuantu/WhoIsTheImposter">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Ai Là Người Giả Mạo?</h3>

  <p align="center">
    Trò chơi truyền tay — tìm người giả mạo trong bè bạn
    <br />
    <a href="https://github.com/hoangtuantu/WhoIsTheImposter"><strong>Khám phá tài liệu »</strong></a>
    <br />
    <br />
    <a href="https://github.com/hoangtuantu/WhoIsTheImposter">Xem Demo</a>
    &middot;
    <a href="https://github.com/hoangtuantu/WhoIsTheImposter/issues/new?labels=bug&template=bug-report---.md">Báo Lỗi</a>
    &middot;
    <a href="https://github.com/hoangtuantu/WhoIsTheImposter/issues/new?labels=enhancement&template=feature-request---.md">Yêu Cầu Tính Năng</a>
  </p>
</div>

---

## Giới Thiệu Dự Án

[![Product Name Screen Shot][product-screenshot]](https://example.com)

Trò chơi truyền tay theo phong cách "Ai Là Người Giả Mạo?" / Mafia / Among Us. Một người chơi sẽ là người giả mạo — những người còn lại là dân thường. Lần lượt mỗi người xem từ bí mật của mình, sau đó thảo luận và bỏ phiếu để loại bỏ người giả mạo trước khi họ phá hoại cả nhóm.

Tính năng chính:

* Chơi truyền tay trên một thiết bị duy nhất — không cần mạng
* Cấu hình số người chơi (3–12) và số người giả mạo
* Hai chế độ người giả mạo: **Biết Mình Là Ai** (người giả mạo biết vai trò và nhận gợi ý liên quan để đánh lạc hướng) và **Ẩn Danh** (người giả mạo chỉ thấy một từ tương tự từ của dân thường, không biết mình là người giả mạo)
* Hẹn giờ thảo luận tùy chọn với thanh tiến trình tròn
* Chống gian lận — ẩn màn hình khi người chơi chuyển tab
* Kho từ vựng với 50+ cặp từ tiếng Việt (dựa trên CSV, dễ mở rộng)
* Hỗ trợ chơi nhiều ván — chơi đến khi dân thường hoặc người giả mạo chiến thắng
* Hiệu ứng confetti khi kết thúc ván chơi
* Hoàn toàn chạy phía client — không cần backend, không cần bước biên dịch

Quy trình:
Cài đặt → Nhập Tên → Truyền Máy → Xem Bí Mật → Thảo Luận → Bỏ Phiếu → Loại → Kết Quả

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

### Công Nghệ Sử Dụng

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Canvas-2D_Graphics?style=for-the-badge" />
  <img src="https://img.shields.io/badge/CSV-Data-blue?style=for-the-badge" />
</p>

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Bắt Đầu

### Điều Kiện Tiên Quyết

* Trình duyệt web hiện đại (Chrome, Firefox, Safari, Edge)
* Không cần cài đặt hay biên dịch

---

### Cài Đặt

1. Sao chép kho lưu trữ

```sh
git clone https://github.com/hoangtuantu/WhoIsTheImposter.git
```

2. Mở thư mục dự án

```sh
cd WhoIsTheImposter
```

3. Mở `index.html` bằng trình duyệt

```sh
# Trên Windows
start index.html

# Trên macOS
open index.html

# Trên Linux
xdg-open index.html
```

Hoặc chỉ cần nhấp đúp vào `index.html`.

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Hướng Dẫn Sử Dụng

### Cách Chơi

1. **Cài đặt** — Cấu hình số người chơi, số người giả mạo, chế độ người giả mạo và hẹn giờ tùy chọn.
2. **Nhập Tên** — Nhập tên cho mỗi người chơi.
3. **Truyền Máy** — Truyền thiết bị cho người tiếp theo. Họ nhấn để xem từ bí mật của mình.
4. **Xem Bí Mật** — Người chơi hiện tại xem từ của mình một cách riêng tư. Màn hình sẽ bị ẩn khi họ chuyển tab (chống gian lận).
5. **Thảo Luận** — Tất cả người chơi thảo luận công khai. Nếu bật hẹn giờ, lượt thảo luận sẽ có giới hạn thời gian.
6. **Bỏ Phiếu** — Mỗi người chơi bỏ phiếu cho người mà họ nghi là người giả mạo.
7. **Loại** — Người bị bỏ phiếu sẽ được tiết lộ là dân thường hoặc người giả mạo.
8. **Kết Quả** — Trò chơi kết thúc khi tất cả người giả mạo bị loại (dân thường thắng) hoặc người giả mạo đông hơn dân thường (người giả mạo thắng).

### Chế Độ Người Giả Mạo

* **Biết Mình Là Ai** — Người giả mạo biết vai trò của mình và nhận một gợi ý liên quan để đánh lạc hướng.
* **Ẩn Danh** — Người giả mạo chỉ thấy một từ tương tự từ của dân thường, không có dấu hiệu nào cho thấy họ là người giả mạo.

### Kho Từ Vựng

Từ được tải từ `words.csv`. Mỗi hàng chứa:

```csv
tu_that,tu_lien_quan,goi_y
Phở,Bánh mì,Món ăn đường phố Việt Nam
Biển,Nhà tắm,Quán cà phê có view biển
```

Cột thứ nhất là từ của dân thường, cột thứ hai là từ liên quan hiển thị cho người giả mạo ở chế độ ẩn danh, và cột thứ ba là gợi ý tùy chọn hiển thị cho người giả mạo ở chế độ biết mình là ai.

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Lộ Trình Phát Triển

* [ ] Hỗ trợ đa ngôn ngữ (Tiếng Anh, Tiếng Nhật, Tiếng Hàn, v.v.)
* [ ] Hiệu ứng âm thanh và nhạc nền
* [ ] Gói từ tùy chỉnh
* [ ] Chơi trực tuyến nhiều người (WebRTC / WebSocket)
* [ ] Ứng dụng di động (Capacitor / PWA)
* [ ] Theo dõi điểm số và thống kê
* [ ] Tùy chỉnh chủ đề (tối / sáng / tùy chỉnh)

Xem các [vấn đề mở](https://github.com/hoangtuantu/WhoIsTheImposter/issues)

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Đóng Góp

1. Fork dự án
2. Tạo nhánh (`feature/...`)
3. Đ commit thay đổi
4. Push lên nhánh
5. Tạo Pull Request

---

### Top người đóng góp:

<a href="https://github.com/hoangtuantu/WhoIsTheImposter/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=hoangtuantu/WhoIsTheImposter" />
</a>

---

## Giấy Phép

Phân phối theo Giấy Phép MIT.

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Liên Hệ

hoangtuantu - [hoangtuantu893@gmail.com](mailto:hoangtuantu893@gmail.com)

Liên kết dự án:
https://github.com/hoangtuantu/WhoIsTheImposter

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

## Lời Cảm ơn

* Các định dạng trò chơi Among Us / Mafia / Werewolf
* FaceNet paper
* PyTorch
* MTCNN
* Cloudflare R2

<p align="right">(<a href="#readme-top">lên đầu trang</a>)</p>

---

[contributors-shield]: https://img.shields.io/github/contributors/hoangtuantu/WhoIsTheImposter.svg?style=for-the-badge
[contributors-url]: https://github.com/hoangtuantu/WhoIsTheImposter/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/hoangtuantu/WhoIsTheImposter.svg?style=for-the-badge
[forks-url]: https://github.com/hoangtuantu/WhoIsTheImposter/network/members
[stars-shield]: https://img.shields.io/github/stars/hoangtuantu/WhoIsTheImposter.svg?style=for-the-badge
[stars-url]: https://github.com/hoangtuantu/WhoIsTheImposter/stargazers
[issues-shield]: https://img.shields.io/github/issues/hoangtuantu/WhoIsTheImposter.svg?style=for-the-badge
[issues-url]: https://github.com/hoangtuantu/WhoIsTheImposter/issues
[license-shield]: https://img.shields.io/github/license/hoangtuantu/WhoIsTheImposter.svg?style=for-the-badge
[license-url]: https://github.com/hoangtuantu/WhoIsTheImposter/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png