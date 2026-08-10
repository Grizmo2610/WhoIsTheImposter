# Ai Là Người Giấu Mặt — Android App (Capacitor)

## Cấu trúc thư mục

```
├── www/                    ← Web assets (HTML/CSS/JS) — nguồn sự thật
│   ├── index.html
│   ├── styles.css          ← đã fix responsive màn kết quả
│   ├── api.js              ← đã thêm offline detection + word cache
│   └── script.js
├── android/                ← Tạo ra sau khi chạy `npx cap add android`
├── capacitor.config.json   ← Cấu hình Capacitor
├── package.json
└── build-android.sh        ← Script build nhanh
```

## Yêu cầu

- **Node.js** >= 18 (`node -v`)
- **Android Studio** + Android SDK (API level 22+)
- **JDK 17** (đi kèm với Android Studio)
- Biến môi trường `ANDROID_HOME` hoặc `ANDROID_SDK_ROOT` đã set

## Các bước build APK

### Lần đầu
```bash
# 0. (Tùy chọn) Cập nhật kho từ vựng từ backend
cd ../backend
python export_word_pairs.py --out ..\AndroidApp\www\word_pairs.json
cd ../AndroidApp

# 1. Cài npm packages
npm install

# 2. Thêm platform Android
npx cap add android

# 3. Sync assets vào Android project
npx cap sync android

# 4. Mở Android Studio để build
npx cap open android
```

Trong Android Studio:
- Chờ Gradle sync xong
- **Build > Build Bundle(s)/APK(s) > Build APK(s)**
- APK xuất ra: `android/app/build/outputs/apk/debug/app-debug.apk`

### Lần sau (khi sửa code web)
```bash
npx cap sync android
# Rồi build lại trong Android Studio hoặc:
npx cap run android   # build + deploy thẳng lên thiết bị
```

---

## Vẫn chạy được trên web

Tất cả thay đổi đều **backward compatible** với web:
- `www/index.html` — thêm `viewport-fit=cover` (vô hại trên web) và CSP header
- `www/api.js` — offline detection chỉ kích hoạt khi `window.Capacitor` tồn tại
- `www/styles.css` — chỉ fix `overflow-y: auto` và `flex-wrap` cho màn kết quả

Để chạy web như cũ:
```bash
cd www
python -m http.server 5500
# Truy cập http://localhost:5500
```

---

## Offline / Tải từ

### Cách hoạt động
1. **Lần đầu cần mạng**: App gọi API server để tải từ vựng (word list).  
   Nếu không có mạng → báo lỗi rõ ràng: *"Cần kết nối mạng lần đầu để tải từ vựng."*

2. **Lần sau offline được**: Sau khi đã play ít nhất 1 ván thành công, `api.js` cache `word_list` vào `localStorage` với TTL 7 ngày.  
   Lần sau không có mạng → game vẫn chạy offline với từ đã cache.

3. **Cache hết hạn** (sau 7 ngày không online): App tự xóa cache và yêu cầu kết nối lại.

### Điều kiện offline hiện tại của script.js
`canRunOffline()` trong `script.js` đã có sẵn — kiểm tra xem tất cả player đã có `secret` chưa. Khi backend không kết nối được, game fallback sang `localEliminate()` và `localReveal()`. Behavior này được giữ nguyên.

---

## Thay đổi trong lần này

### `www/styles.css`
- **`.screen`**: Thêm `overflow-y: auto; -webkit-overflow-scrolling: touch;` → màn hình result cuộn được khi có nhiều người chơi
- **`.result-item`**: Thêm `flex-wrap: wrap; gap: 6px;` → badge role không bị cắt
- **`.result-meta`**: Thêm `flex: 1; min-width: 0;` và `text-overflow: ellipsis` → tên dài không tràn layout

### `www/api.js`
- Thêm `checkConnectivity()`: ping `/health` với timeout 3s để phát hiện mạng thực sự
- Thêm `wordCache`: helper lưu/đọc word list vào localStorage, TTL 7 ngày
- `API_BASE` tự nhận diện môi trường Capacitor → gọi production URL

### `www/index.html`
- `viewport-fit=cover`: safe area cho iPhone notch / Android punch-hole camera
- CSP meta tag: cho phép kết nối tới backend URL (bắt buộc trong WebView Capacitor)
