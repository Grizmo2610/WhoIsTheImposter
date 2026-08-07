from __future__ import annotations

import csv
import io
import logging
import random
from abc import ABC, abstractmethod

from app.models import WordEntry

logger = logging.getLogger("game.storage")

DEFAULT_HINT = "This word shares a topic with the real word."
DEFAULT_MEANING = "(no explanation provided)"
LIST_SEP = ";"
CSV_HEADER = "word,topic,hints,meaning"


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

    async def get_related_entry(self, topic: str, exclude_word: str, same_topic: bool = True) -> WordEntry:
        """Chọn 1 từ khác để làm từ của imposter (chế độ ẩn danh).
        same_topic=True  -> lấy từ CÙNG chủ đề (khó nhận ra imposter hơn)
        same_topic=False -> lấy từ chủ đề KHÁC hẳn (dễ nhận ra hơn, thử thách khác)
        Vì chọn ngẫu nhiên trong toàn bộ word bank mỗi ván, cùng 1 từ có thể
        là 'từ thật' ở ván này nhưng lại là 'từ imposter' ở ván khác."""
        entries = await self._get_entries()
        if same_topic:
            pool = [e for e in entries if e.topic == topic and e.word != exclude_word]
        else:
            pool = [e for e in entries if e.topic != topic and e.word != exclude_word]

        if pool:
            chosen = random.choice(pool)
            logger.debug("Chọn từ imposter (same_topic=%s, chủ đề='%s'): %s",
                         same_topic, topic, chosen.word)
            return chosen

        logger.warning("Không đủ từ cho same_topic=%s, chủ đề='%s' — fallback sang bất kỳ từ nào khác",
                       same_topic, topic)
        others = [e for e in entries if e.word != exclude_word]
        if not others:
            raise RuntimeError("Word bank chỉ có 1 từ duy nhất — không đủ để chơi.")
        return random.choice(others)

    async def append_entry(self, entry: WordEntry) -> None:
        raw = await self.load_raw_csv()
        if not raw.strip():
            raw = CSV_HEADER + "\n"
        if not raw.endswith("\n"):
            raw += "\n"
        raw += self._serialize_row(entry) + "\n"
        await self.save_raw_csv(raw)
        logger.info("Đã thêm từ mới vào word bank: word=%s topic=%s", entry.word, entry.topic)

    async def get_entry(self, word: str) -> WordEntry | None:
        """Tìm 1 từ theo tên (không phân biệt hoa/thường)."""
        entries = await self._get_entries()
        for e in entries:
            if e.word.strip().lower() == word.strip().lower():
                return e
        return None

    async def update_entry(self, word: str, new_entry: WordEntry) -> bool:
        """Sửa 1 từ đã có (tìm theo `word`, ghi đè toàn bộ bằng `new_entry`).
        Trả về False nếu không tìm thấy từ cần sửa."""
        entries = await self._get_entries()
        found = False
        for i, e in enumerate(entries):
            if e.word.strip().lower() == word.strip().lower():
                entries[i] = new_entry
                found = True
                break
        if not found:
            logger.warning("Không tìm thấy từ '%s' để sửa", word)
            return False
        await self._save_entries(entries)
        logger.info("Đã sửa từ '%s' -> word=%s topic=%s", word, new_entry.word, new_entry.topic)
        return True

    async def delete_entry(self, word: str) -> bool:
        """Xóa 1 từ theo tên. Trả về False nếu không tìm thấy."""
        entries = await self._get_entries()
        new_entries = [e for e in entries if e.word.strip().lower() != word.strip().lower()]
        if len(new_entries) == len(entries):
            logger.warning("Không tìm thấy từ '%s' để xóa", word)
            return False
        await self._save_entries(new_entries)
        logger.info("Đã xóa từ '%s' khỏi word bank", word)
        return True

    async def _save_entries(self, entries: list[WordEntry]) -> None:
        buf = [CSV_HEADER]
        for e in entries:
            buf.append(self._serialize_row(e))
        raw = "\n".join(buf) + "\n"
        await self.save_raw_csv(raw)

    async def _get_entries(self) -> list[WordEntry]:
        raw = await self.load_raw_csv()
        return self.parse_csv(raw)

    @staticmethod
    def _serialize_row(entry: WordEntry) -> str:
        buf = io.StringIO()
        writer = csv.writer(buf, lineterminator="")
        hints = LIST_SEP.join(h.replace(LIST_SEP, ",").strip() for h in entry.hints)
        writer.writerow([entry.word.strip(), entry.topic.strip(), hints, entry.meaning.strip()])
        return buf.getvalue()

    @staticmethod
    def parse_csv(raw: str) -> list[WordEntry]:
        entries: list[WordEntry] = []
        reader = csv.reader(io.StringIO(raw))
        rows = list(reader)
        for i, row in enumerate(rows):
            if i == 0:
                continue  # dòng đầu luôn là tiêu đề cột: word,topic,hints,meaning
            if len(row) < 2 or not row[0].strip() or not row[1].strip():
                continue
            hints = ([s.strip() for s in row[2].split(LIST_SEP) if s.strip()]
                      if len(row) > 2 and row[2].strip() else [])
            if not hints:
                hints = [DEFAULT_HINT]
            meaning = row[3].strip() if len(row) > 3 and row[3].strip() else DEFAULT_MEANING
            entries.append(WordEntry(word=row[0].strip(), topic=row[1].strip(),
                                      hints=hints, meaning=meaning))
        logger.info("Đã parse %d từ từ CSV", len(entries))
        return entries