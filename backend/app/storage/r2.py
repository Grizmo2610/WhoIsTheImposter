from __future__ import annotations

import logging
import time

import boto3
from botocore.config import Config as BotoConfig

from app.storage.base import WordRepository

logger = logging.getLogger("game.storage.r2")


class R2WordRepository(WordRepository):
    """
    Đọc words.csv từ Cloudflare R2 (hoặc bất kỳ storage tương thích S3 nào:
    AWS S3, MinIO, Backblaze B2...) qua boto3.

    R2 dùng API tương thích S3 — chỉ cần trỏ endpoint_url về R2 và dùng
    Access Key / Secret Key tạo trong dashboard Cloudflare (R2 > Manage API Tokens).
    """

    def __init__(
        self,
        bucket: str,
        object_key: str,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
        cache_ttl: int = 300,
    ):
        self.bucket = bucket
        self.object_key = object_key
        self.cache_ttl = cache_ttl
        self._cached_raw: str | None = None
        self._cached_at: float = 0.0

        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            config=BotoConfig(signature_version="s3v4"),
            region_name="auto",  # R2 dùng "auto"
        )

    async def load_raw_csv(self) -> str:
        now = time.monotonic()
        if self._cached_raw is not None and (now - self._cached_at) < self.cache_ttl:
            logger.debug("Dùng word bank từ cache (còn %.0fs)", self.cache_ttl - (now - self._cached_at))
            return self._cached_raw

        import anyio

        def _fetch() -> str:
            obj = self._client.get_object(Bucket=self.bucket, Key=self.object_key)
            return obj["Body"].read().decode("utf-8")

        logger.info("Tải word bank từ R2: bucket=%s key=%s", self.bucket, self.object_key)
        try:
            raw = await anyio.to_thread.run_sync(_fetch)
        except Exception:
            logger.warning("Không tải được word bank từ R2, dùng cache cũ nếu có", exc_info=True)
            if self._cached_raw is not None:
                return self._cached_raw
            raise
        self._cached_raw = raw
        self._cached_at = now
        return raw

    async def save_raw_csv(self, content: str) -> None:
        await self.upload_csv(content)

    async def upload_csv(self, content: str) -> None:
        """Tiện ích: cho phép admin cập nhật word bank thẳng lên R2 qua script/API."""
        import anyio

        def _put() -> None:
            self._client.put_object(
                Bucket=self.bucket,
                Key=self.object_key,
                Body=content.encode("utf-8"),
                ContentType="text/csv",
            )

        logger.info("Ghi word bank lên R2: bucket=%s key=%s", self.bucket, self.object_key)
        await anyio.to_thread.run_sync(_put)
        self._cached_raw = content
        self._cached_at = time.monotonic()