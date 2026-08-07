from __future__ import annotations

import logging
from functools import lru_cache

from app.config import Settings, get_settings
from app.storage.base import WordRepository
from app.storage.d1 import D1WordRepository
from app.storage.local import LocalCsvWordRepository
from app.storage.r2 import R2WordRepository

logger = logging.getLogger("game.storage.factory")


@lru_cache
def get_word_repository() -> WordRepository:
    """
    Điểm chuyển đổi duy nhất giữa local / R2 / D1.
    Đổi WORDBANK_BACKEND=r2 hoặc d1 trong .env + điền các biến tương ứng
    là xong, không cần sửa router hay game engine.
    """
    settings: Settings = get_settings()

    if settings.wordbank_backend == "d1":
        missing = [
            name for name, val in {
                "D1_ACCOUNT_ID": settings.d1_account_id,
                "D1_DATABASE_ID": settings.d1_database_id,
                "D1_API_TOKEN": settings.d1_api_token,
            }.items() if not val
        ]
        if missing:
            logger.error("WORDBANK_BACKEND=d1 nhưng thiếu biến môi trường: %s", ", ".join(missing))
            raise RuntimeError(
                f"WORDBANK_BACKEND=d1 nhưng thiếu biến môi trường: {', '.join(missing)}"
            )
        logger.info("Word bank backend: D1 (database_id=%s)", settings.d1_database_id)
        return D1WordRepository(
            account_id=settings.d1_account_id,
            database_id=settings.d1_database_id,
            api_token=settings.d1_api_token,
            cache_ttl=settings.wordbank_cache_ttl,
        )

    if settings.wordbank_backend == "r2":
        missing = [
            name for name, val in {
                "R2_BUCKET": settings.r2_bucket,
                "R2_ENDPOINT_URL": settings.r2_endpoint_url,
                "R2_ACCESS_KEY_ID": settings.r2_access_key_id,
                "R2_SECRET_ACCESS_KEY": settings.r2_secret_access_key,
            }.items() if not val
        ]
        if missing:
            logger.error("WORDBANK_BACKEND=r2 nhưng thiếu biến môi trường: %s", ", ".join(missing))
            raise RuntimeError(
                f"WORDBANK_BACKEND=r2 nhưng thiếu biến môi trường: {', '.join(missing)}"
            )
        logger.info("Word bank backend: R2 (bucket=%s)", settings.r2_bucket)
        return R2WordRepository(
            bucket=settings.r2_bucket,
            object_key=settings.wordbank_object_key,
            endpoint_url=settings.r2_endpoint_url,
            access_key_id=settings.r2_access_key_id,
            secret_access_key=settings.r2_secret_access_key,
            cache_ttl=settings.wordbank_cache_ttl,
        )

    logger.info("Word bank backend: local (path=%s)", settings.wordbank_local_path)
    return LocalCsvWordRepository(path=settings.wordbank_local_path)