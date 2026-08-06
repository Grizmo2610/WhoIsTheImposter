"""
Interface trừu tượng cho nguồn dữ liệu từ vựng (word bank).
Mọi backend cụ thể (local CSV, R2/S3, DB...) chỉ cần implement lớp này —
phần còn lại của app (game engine, router) không cần biết dữ liệu đến từ đâu.

Định dạng CSV: tu_that,tu_lien_quan,goi_y
- tu_that: 1 từ thật (bắt buộc)
- tu_lien_quan: nhiều từ liên quan, phân cách bằng dấu ";" (vd: "Bún bò;Bún riêu")
- goi_y: nhiều gợi ý, phân cách bằng dấu ";" (vd: "Món nước;Ăn kèm rau sống")
"""
from __future__ import annotations

import csv
import io
import logging
import random
from abc import ABC, abstractmethod

from app.models import WordEntry

logger = logging.getLogger("game.storage")

DEFAULT_HINT = "Từ này có liên quan gần với chủ đề của từ thật."
LIST_SEP = ";"


class WordRepository(ABC):
    @abstractmethod
    async def load_raw_csv(self) -> str:
        """Trả về nội dung CSV thô (utf-8 text)."""
        raise NotImplementedError

    @abstractmethod
    async def save_raw_csv(self, content: str) -> None:
        """Ghi đè toàn bộ nội dung CSV — dùng bởi script quản trị thêm từ."""
        raise NotImplementedError

    async def get_random_entry(self) -> WordEntry:
        entries = await self._get_entries()
        if not entries:
            raise RuntimeError("Word bank rỗng — kiểm tra lại nguồn dữ liệu.")
        entry = random.choice(entries)
        logger.debug("Chọn từ ngẫu nhiên: real=%s (n_related=%d, n_hints=%d)",
                      entry.real, len(entry.related), len(entry.hints))
        return entry

    async def append_entry(self, entry: WordEntry) -> None:
        """Thêm 1 dòng mới vào word bank (dùng bởi scripts/manage_words.py)."""
        raw = await self.load_raw_csv()
        if not raw.strip():
            raw = "tu_that,tu_lien_quan,goi_y\n"
        if not raw.endswith("\n"):
            raw += "\n"
        raw += self._serialize_row(entry) + "\n"
        await self.save_raw_csv(raw)
        logger.info("Đã thêm từ mới vào word bank: real=%s", entry.real)

    async def _get_entries(self) -> list[WordEntry]:
        raw = await self.load_raw_csv()
        return self.parse_csv(raw)

    @staticmethod
    def _serialize_row(entry: WordEntry) -> str:
        def esc(s: str) -> str:
            return s.replace(",", " ").replace("\n", " ").strip()
        real = esc(entry.real)
        related = LIST_SEP.join(esc(r) for r in entry.related)
        hints = LIST_SEP.join(esc(h) for h in entry.hints)
        return f"{real},{related},{hints}"

    @staticmethod
    def parse_csv(raw: str) -> list[WordEntry]:
        entries: list[WordEntry] = []
        reader = csv.reader(io.StringIO(raw))
        rows = list(reader)
        for i, row in enumerate(rows):
            if i == 0:
                continue  # dòng đầu luôn là tiêu đề cột
            if len(row) < 2 or not row[0].strip() or not row[1].strip():
                continue
            related = [s.strip() for s in row[1].split(LIST_SEP) if s.strip()]
            hints = ([s.strip() for s in row[2].split(LIST_SEP) if s.strip()]
                      if len(row) > 2 and row[2].strip() else [])
            if not hints:
                hints = [DEFAULT_HINT]
            entries.append(WordEntry(real=row[0].strip(), related=related, hints=hints))
        logger.info("Đã parse %d dòng từ vựng từ CSV", len(entries))
        return entries