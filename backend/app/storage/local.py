from __future__ import annotations

import aiofiles

from app.storage.base import WordRepository


class LocalCsvWordRepository(WordRepository):
    """Đọc words.csv từ đĩa cục bộ — dùng mặc định khi chạy dev/tự host."""

    def __init__(self, path: str):
        self.path = path

    async def load_raw_csv(self) -> str:
        async with aiofiles.open(self.path, mode="r", encoding="utf-8") as f:
            return await f.read()