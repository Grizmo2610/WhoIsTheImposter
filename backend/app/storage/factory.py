from __future__ import annotations

from functools import lru_cache

from app.config import Settings, get_settings
from app.storage.base import WordRepository
from app.storage.local import LocalCsvWordRepository
from app.storage.r2 import R2WordRepository


@lru_cache
def get_word_repository() -> WordRepository:
    """
    Điểm chuyển đổi duy nhất giữa local và cloud.
    Đổi WORDBANK_BACKEND=r2 trong .env + điền các biến R2_* là xong,
    không cần sửa router hay game engine.
    """
    settings: Settings = get_settings()

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
            raise RuntimeError(
                f"WORDBANK_BACKEND=r2 nhưng thiếu biến môi trường: {', '.join(missing)}"
            )
        return R2WordRepository(
            bucket=settings.r2_bucket,
            object_key=settings.wordbank_object_key,
            endpoint_url=settings.r2_endpoint_url,
            access_key_id=settings.r2_access_key_id,
            secret_access_key=settings.r2_secret_access_key,
            cache_ttl=settings.wordbank_cache_ttl,
        )

    return LocalCsvWordRepository(path=settings.wordbank_local_path)