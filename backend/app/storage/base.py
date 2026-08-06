from __future__ import annotations

import csv
import io
import logging
import random
from abc import ABC, abstractmethod

from app.models import WordEntry

logger = logging.getLogger("game.storage")

DEFAULT_HINT = "Từ này thuộc cùng chủ đề với từ thật."
LIST_SEP = ";"


class WordRepository(ABC):
    @abstractmethod
    async def load_raw_csv(self) -> str:
        raise NotImplementedError

    @abstractmethod
    async def save_raw_csv(self, content: str) -> None:
        raise NotImplementedError

    async def get_random_entry(self) -> WordEntry:
        entries = await self._get_entries()
        if not entries:
            raise RuntimeError("Word bank rỗng — kiểm tra lại nguồn dữ liệu.")
        entry = random.choice(entries)
        logger.debug("Chọn từ thật ngẫu nhiên: word=%s topic=%s", entry.word, entry.topic)
        return entry

    async def get_related_entry(self, topic: str, exclude_word: str) -> WordEntry:
        """Chọn 1 từ khác CÙNG chủ đề để làm từ của imposter (chế độ ẩn danh).
        Vì chọn ngẫu nhiên trong toàn bộ word bank mỗi ván, cùng 1 từ có thể
        là 'từ thật' ở ván này nhưng lại là 'từ imposter' ở ván khác."""
        entries = await self._get_entries()
        same_topic = [e for e in entries if e.topic == topic and e.word != exclude_word]
        if same_topic:
            chosen = random.choice(same_topic)
            logger.debug("Chọn từ liên quan cùng chủ đề '%s': %s", topic, chosen.word)
            return chosen

        logger.warning("Chủ đề '%s' không đủ từ khác — fallback sang từ ngẫu nhiên khác chủ đề", topic)
        others = [e for e in entries if e.word != exclude_word]
        if not others:
            raise RuntimeError("Word bank chỉ có 1 từ duy nhất — không đủ để chơi.")
        return random.choice(others)

    async def append_entry(self, entry: WordEntry) -> None:
        raw = await self.load_raw_csv()
        if not raw.strip():
            raw = "tu,chu_de,goi_y\n"
        if not raw.endswith("\n"):
            raw += "\n"
        raw += self._serialize_row(entry) + "\n"
        await self.save_raw_csv(raw)
        logger.info("Đã thêm từ mới vào word bank: word=%s topic=%s", entry.word, entry.topic)

    async def _get_entries(self) -> list[WordEntry]:
        raw = await self.load_raw_csv()
        return self.parse_csv(raw)

    @staticmethod
    def _serialize_row(entry: WordEntry) -> str:
        def esc(s: str) -> str:
            return s.replace(",", " ").replace("\n", " ").strip()
        word = esc(entry.word)
        topic = esc(entry.topic)
        hints = LIST_SEP.join(esc(h) for h in entry.hints)
        return f"{word},{topic},{hints}"

    @staticmethod
    def parse_csv(raw: str) -> list[WordEntry]:
        entries: list[WordEntry] = []
        reader = csv.reader(io.StringIO(raw))
        rows = list(reader)
        for i, row in enumerate(rows):
            if i == 0:
                continue  # dòng đầu luôn là tiêu đề cột: tu,chu_de,goi_y
            if len(row) < 2 or not row[0].strip() or not row[1].strip():
                continue
            hints = ([s.strip() for s in row[2].split(LIST_SEP) if s.strip()]
                      if len(row) > 2 and row[2].strip() else [])
            if not hints:
                hints = [DEFAULT_HINT]
            entries.append(WordEntry(word=row[0].strip(), topic=row[1].strip(), hints=hints))
        logger.info("Đã parse %d từ từ CSV", len(entries))
        return entries