from __future__ import annotations

import csv
import io
import random
from abc import ABC, abstractmethod

from app.models import WordEntry


class WordRepository(ABC):
    @abstractmethod
    async def load_raw_csv(self) -> str:
        """Trả về nội dung CSV thô (utf-8 text)."""
        raise NotImplementedError

    async def get_random_entry(self) -> WordEntry:
        entries = await self._get_entries()
        if not entries:
            raise RuntimeError("Word bank rỗng — kiểm tra lại nguồn dữ liệu.")
        return random.choice(entries)

    async def _get_entries(self) -> list[WordEntry]:
        raw = await self.load_raw_csv()
        return self._parse_csv(raw)

    @staticmethod
    def _parse_csv(raw: str) -> list[WordEntry]:
        entries: list[WordEntry] = []
        reader = csv.reader(io.StringIO(raw))
        rows = list(reader)
        for i, row in enumerate(rows):
            if i == 0:
                continue  # dòng đầu luôn là tiêu đề cột: tu_that,tu_lien_quan,goi_y
            if len(row) < 2 or not row[0].strip() or not row[1].strip():
                continue
            entries.append(
                WordEntry(
                    real=row[0].strip(),
                    related=row[1].strip(),
                    hint=(row[2].strip() if len(row) > 2 and row[2].strip()
                          else "Từ này có liên quan gần với chủ đề của từ thật."),
                )
            )
        return entries