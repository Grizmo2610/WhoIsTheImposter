from __future__ import annotations

import logging

import aiofiles

from app.storage.base import WordRepository

logger = logging.getLogger("game.storage.local")


class LocalCsvWordRepository(WordRepository):
    """Đọc/ghi words.csv trên đĩa cục bộ — dùng mặc định khi chạy dev/tự host."""

    def __init__(self, path: str):
        self.path = path

    async def load_raw_csv(self) -> str:
        logger.debug("Đọc word bank từ file local: %s", self.path)
        async with aiofiles.open(self.path, mode="r", encoding="utf-8") as f:
            return await f.read()

    async def save_raw_csv(self, content: str) -> None:
        logger.info("Ghi word bank xuống file local: %s", self.path)
        async with aiofiles.open(self.path, mode="w", encoding="utf-8") as f:
            await f.write(content)