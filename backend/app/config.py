from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # --- App ---
    app_name: str = "Ai La Nguoi Giau Mat API"
    cors_origins: list[str] = ["*"]
    log_level: str = "INFO"  # TRACE | DEBUG | INFO | WARNING | ERROR

    # --- Word bank storage backend: "local" | "r2" ---
    wordbank_backend: str = "local"

    # Local backend
    wordbank_local_path: str = "data/words.csv"

    # R2 / S3-compatible backend
    # R2 dùng API tương thích S3 nên chỉ cần boto3 + endpoint_url riêng.
    r2_account_id: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket: str | None = None
    r2_endpoint_url: str | None = None  # vd: https://<account_id>.r2.cloudflarestorage.com
    wordbank_object_key: str = "words.csv"

    # Cache TTL (giây) cho word bank tải từ cloud, tránh gọi API mỗi request
    wordbank_cache_ttl: int = 300

    # --- Room state store: "memory" | "redis" (để ngỏ, chưa bật) ---
    room_store_backend: str = "memory"
    redis_url: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()