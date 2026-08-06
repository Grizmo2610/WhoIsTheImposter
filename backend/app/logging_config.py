"""
Cấu hình logging tập trung cho toàn app.

Thêm level TRACE (thấp hơn DEBUG) vì Python logging mặc định không có,
để log được cả những chi tiết vụn vặt nhất khi cần soi lỗi sâu.

Vì deploy trên Render/Railway (free tier) không có ổ đĩa bền, log chỉ
ghi ra stdout — các nền tảng này tự hứng và hiển thị trong dashboard,
không cần tự quản lý file log hay xoay vòng log (log rotation).
"""
from __future__ import annotations

import logging
import sys

TRACE_LEVEL_NUM = 5
logging.addLevelName(TRACE_LEVEL_NUM, "TRACE")


def _trace(self: logging.Logger, message, *args, **kwargs):
    if self.isEnabledFor(TRACE_LEVEL_NUM):
        self._log(TRACE_LEVEL_NUM, message, args, **kwargs)


logging.Logger.trace = _trace  # type: ignore[attr-defined]

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)-22s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.setLevel(level.upper())

    # Xoá handler mặc định (uvicorn có thể đã set) để tránh log lặp đôi.
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
    root.addHandler(handler)

    # Giảm độ ồn của các thư viện bên thứ 3 trừ khi đang debug sâu.
    for noisy in ("uvicorn.access", "botocore", "boto3", "urllib3"):
        logging.getLogger(noisy).setLevel(max(logging.WARNING, root.level))

    logging.getLogger("game").info("Logging đã sẵn sàng — level=%s", level.upper())