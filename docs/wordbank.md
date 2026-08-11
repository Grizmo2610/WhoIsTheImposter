# Kho từ offline

## Runtime source

Frontend import trực tiếp:

- `src/data/word_pairs.json`: 332 object nguồn `{ real, related, hint, meaning }`; repository chuẩn hóa thành schema runtime có `id`, `topic`, `difficulty`, `audience`, `locale`, `enabled`.
- `src/data/word-topic-map.json`: mapping phụ `word → topic`.

Schema của từng object trong `word_pairs.json` không thay đổi. Topic map không được merge vào object runtime.

`WordRepository` là abstraction duy nhất được game engine sử dụng. Constructor validate toàn bộ mảng và `assertReady()` ném `WORD_BANK_EMPTY` nếu dữ liệu rỗng. UI không bật Start cho đến khi repository ở trạng thái `ready`.

## Các chế độ

- `similar`: imposter nhận field `related` của cùng pair.
- `no-word`: imposter không có từ và nhận `hint`.
- `different-topic`: lọc candidate theo topic map và chọn candidate có topic khác từ thật.
- Nếu metadata topic thiếu hoàn toàn, repository dùng tập candidate loại từ thật/từ related, trả `source: "fallback"` và hành vi vẫn deterministic khi truyền random source trong test. Đây là fallback công khai, không được mô tả là bảo đảm khác topic.
- Khi chơi tất cả chủ đề, repository random topic trước rồi mới random cặp để topic lớn không chiếm ưu thế. Filter topic/độ khó được áp dụng cho từ dân thường; 50 pair ID gần nhất được loại nếu vẫn còn candidate mới.

## Nguồn quản trị

`backend/data/words.csv` vẫn là nguồn biên tập có cột topic. `backend/export_word_pairs.py` có thể export schema JSON cũ. Khi CSV thay đổi, cần đồng bộ cả pair JSON và topic map rồi chạy unit test `word-repository.test.ts`.

Vì cả hai JSON được bundle vào JavaScript production, không có runtime fetch và không phụ thuộc mạng để tạo ván mới.
