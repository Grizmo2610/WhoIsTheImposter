# Kho từ offline single-source

## Nguồn runtime duy nhất

`src/data/vocabulary_database.json` là nguồn từ duy nhất của Web/PWA và Android Capacitor. Vite import file này trực tiếp vào bundle; gameplay không gọi API, không fetch file từ xa và không đọc CSV, D1, R2 hay S3.

Mỗi record giữ nguyên đúng schema:

```json
{
  "id": 1,
  "topics": ["Ẩm thực & Đồ uống", "Việt Nam"],
  "hint": "Món nước có sợi",
  "related": ["Phở", "Bún bò Huế", "Bún riêu"]
}
```

`src/data/word-database.ts` validate id duy nhất, 1–2 topic hợp lệ, hint không rỗng và related không rỗng/không trùng. Record lỗi được log kèm id và bị loại; nếu không còn record dùng được, loader chuyển UI sang trạng thái lỗi thay vì crash khó hiểu.

File người dùng cung cấp hiện có 148 record. Hai record không đạt schema và được validator loại ở runtime: id 33 có hint rỗng; id 68 có 3 topic. File nguồn không bị tự ý sửa.

## Topic và lựa chọn từ

Danh sách 8 topic nằm duy nhất tại `src/data/word-topics.ts`. Topic selector lưu lựa chọn trong `GameConfig.selectedTopics`; lọc group dùng OR.

Ba mode được triển khai trong `src/data/word-selector.ts`:

- `similar`: chọn một group đủ `imposterCount + 1` từ, sample không lặp, rồi random riêng từ của phe chính diện.
- `no-word`: random một từ trong related cho phe chính diện và cấp hint của cùng group cho mọi Kẻ giả danh.
- `different-group`: chọn hai group khác id nhưng có ít nhất một selected topic chung; phe chính diện lấy một từ từ Group A, mọi Kẻ giả danh lấy các từ không lặp từ cùng Group B.

Nếu candidate pool không đủ, Start Game bị khóa và UI yêu cầu chọn thêm topic hoặc giảm số Kẻ giả danh. Không có fallback ra ngoài selection.

Random utility không mutate nguồn nằm tại `src/data/random.ts`.
