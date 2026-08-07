from __future__ import annotations

import logging
import time

import httpx

from app.models import WordEntry
from app.storage.base import DEFAULT_HINT, DEFAULT_MEANING, LIST_SEP, WordRepository

logger = logging.getLogger("game.storage.d1")

TABLE = "words"

CREATE_TABLE_SQL = f"""
CREATE TABLE IF NOT EXISTS {TABLE} (
    word TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    hints TEXT NOT NULL,
    meaning TEXT NOT NULL
);
"""


class D1WordRepository(WordRepository):
    """
    Đọc/ghi word bank trên Cloudflare D1 (SQLite) qua D1 REST API
    (không có driver Python trực tiếp cho D1 nên gọi HTTP thẳng tới
    Cloudflare API, xác thực bằng API Token).

    Khác với R2 (ghi đè nguyên file CSV mỗi lần sửa), D1 cho phép
    INSERT/UPDATE/DELETE từng dòng — nhanh hơn và tránh mất dữ liệu khi
    nhiều người sửa cùng lúc.
    """

    def __init__(
        self,
        account_id: str,
        database_id: str,
        api_token: str,
        cache_ttl: int = 300,
    ):
        self.account_id = account_id
        self.database_id = database_id
        self.api_token = api_token
        self.cache_ttl = cache_ttl
        self._cached_entries: list[WordEntry] | None = None
        self._cached_at: float = 0.0

        self._base_url = (
            f"https://api.cloudflare.com/client/v4/accounts/{account_id}"
            f"/d1/database/{database_id}/query"
        )

    # ------------------------------------------------------------------
    # HTTP helper
    # ------------------------------------------------------------------
    async def _query(self, sql: str, params: list | None = None) -> list[dict]:
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }
        payload = {"sql": sql, "params": params or []}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(self._base_url, headers=headers, json=payload)

        try:
            data = resp.json()
        except Exception as exc:  # pragma: no cover
            resp.raise_for_status()
            raise RuntimeError(f"D1 trả về response không hợp lệ: {resp.text}") from exc

        if not resp.is_success or not data.get("success", False):
            errors = data.get("errors") or [{"message": resp.text}]
            msg = "; ".join(e.get("message", str(e)) for e in errors)
            logger.error("D1 query lỗi: %s | sql=%s", msg, sql)
            raise RuntimeError(f"D1 query lỗi: {msg}")

        results = data.get("result") or []
        if not results:
            return []
        return results[0].get("results", [])

    async def ensure_schema(self) -> None:
        """Tạo bảng words nếu chưa tồn tại — gọi 1 lần khi migrate/setup."""
        await self._query(CREATE_TABLE_SQL)
        logger.info("Đã đảm bảo bảng '%s' tồn tại trên D1", TABLE)

    # ------------------------------------------------------------------
    # Chuyển đổi row <-> WordEntry
    # ------------------------------------------------------------------
    @staticmethod
    def _row_to_entry(row: dict) -> WordEntry:
        hints_raw = row.get("hints") or ""
        hints = [s.strip() for s in hints_raw.split(LIST_SEP) if s.strip()] or [DEFAULT_HINT]
        meaning = (row.get("meaning") or "").strip() or DEFAULT_MEANING
        return WordEntry(word=row["word"], topic=row["topic"], hints=hints, meaning=meaning)

    @staticmethod
    def _entry_params(entry: WordEntry) -> list:
        hints = LIST_SEP.join(h.replace(LIST_SEP, ",").strip() for h in entry.hints)
        return [entry.word.strip(), entry.topic.strip(), hints, entry.meaning.strip()]

    # ------------------------------------------------------------------
    # Đọc có cache (giống R2) — dùng cho get_random_entry / get_related_entry
    # ------------------------------------------------------------------
    async def _get_entries(self) -> list[WordEntry]:
        now = time.monotonic()
        if self._cached_entries is not None and (now - self._cached_at) < self.cache_ttl:
            return self._cached_entries

        rows = await self._query(f"SELECT word, topic, hints, meaning FROM {TABLE} ORDER BY word;")
        entries = [self._row_to_entry(r) for r in rows]
        self._cached_entries = entries
        self._cached_at = now
        logger.info("Đã tải %d từ từ D1", len(entries))
        return entries

    def _invalidate_cache(self) -> None:
        self._cached_entries = None
        self._cached_at = 0.0

    # ------------------------------------------------------------------
    # CRUD trực tiếp trên D1 (ghi đè bản mặc định trong base.py để tránh
    # phải load/parse/serialize lại toàn bộ CSV mỗi lần sửa 1 dòng)
    # ------------------------------------------------------------------
    async def append_entry(self, entry: WordEntry) -> None:
        await self._query(
            f"INSERT OR REPLACE INTO {TABLE} (word, topic, hints, meaning) VALUES (?, ?, ?, ?);",
            self._entry_params(entry),
        )
        self._invalidate_cache()
        logger.info("Đã thêm/ghi đè từ trên D1: word=%s topic=%s", entry.word, entry.topic)

    async def get_entry(self, word: str) -> WordEntry | None:
        rows = await self._query(
            f"SELECT word, topic, hints, meaning FROM {TABLE} WHERE lower(word) = lower(?) LIMIT 1;",
            [word.strip()],
        )
        if not rows:
            return None
        return self._row_to_entry(rows[0])

    async def update_entry(self, word: str, new_entry: WordEntry) -> bool:
        existing = await self.get_entry(word)
        if existing is None:
            logger.warning("Không tìm thấy từ '%s' để sửa trên D1", word)
            return False

        if new_entry.word.strip().lower() != word.strip().lower():
            # Đổi tên -> xóa dòng cũ rồi chèn dòng mới (word là PRIMARY KEY)
            await self._query(f"DELETE FROM {TABLE} WHERE lower(word) = lower(?);", [word.strip()])
            await self._query(
                f"INSERT INTO {TABLE} (word, topic, hints, meaning) VALUES (?, ?, ?, ?);",
                self._entry_params(new_entry),
            )
        else:
            await self._query(
                f"UPDATE {TABLE} SET topic = ?, hints = ?, meaning = ? WHERE lower(word) = lower(?);",
                [new_entry.topic.strip(),
                 LIST_SEP.join(h.replace(LIST_SEP, ",").strip() for h in new_entry.hints),
                 new_entry.meaning.strip(), word.strip()],
            )
        self._invalidate_cache()
        logger.info("Đã sửa từ '%s' -> word=%s trên D1", word, new_entry.word)
        return True

    async def delete_entry(self, word: str) -> bool:
        existing = await self.get_entry(word)
        if existing is None:
            logger.warning("Không tìm thấy từ '%s' để xóa trên D1", word)
            return False
        await self._query(f"DELETE FROM {TABLE} WHERE lower(word) = lower(?);", [word.strip()])
        self._invalidate_cache()
        logger.info("Đã xóa từ '%s' khỏi D1", word)
        return True

    # ------------------------------------------------------------------
    # Tương thích ngược: xuất/nạp nguyên khối CSV (dùng cho export/import,
    # backup, hoặc migrate qua lại giữa các backend)
    # ------------------------------------------------------------------
    async def load_raw_csv(self) -> str:
        import csv
        import io

        entries = await self._get_entries()
        buf = io.StringIO()
        writer = csv.writer(buf, lineterminator="\n")
        writer.writerow(["word", "topic", "hints", "meaning"])
        for e in entries:
            writer.writerow(self._entry_params(e))
        return buf.getvalue()

    async def save_raw_csv(self, content: str) -> None:
        """Ghi đè TOÀN BỘ bảng words bằng nội dung CSV — dùng khi import.
        Thực hiện trong 1 D1 batch statement (xóa hết rồi chèn lại) để không
        để bảng ở trạng thái rỗng nếu lỗi giữa chừng gây khó chịu."""
        entries = self.parse_csv(content)

        statements = [f"DELETE FROM {TABLE};"]
        # D1 REST API chỉ nhận 1 câu lệnh + params mỗi lần gọi, nên gộp
        # thành nhiều lệnh INSERT riêng, chạy tuần tự sau khi xóa.
        await self._query(f"DELETE FROM {TABLE};")
        for e in entries:
            await self._query(
                f"INSERT INTO {TABLE} (word, topic, hints, meaning) VALUES (?, ?, ?, ?);",
                self._entry_params(e),
            )
        self._invalidate_cache()
        logger.info("Đã ghi đè D1 bằng %d từ", len(entries))
