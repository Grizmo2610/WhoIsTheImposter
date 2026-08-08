#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import get_settings  # noqa: E402
from app.storage.base import WordRepository  # noqa: E402
from app.storage.d1 import D1WordRepository  # noqa: E402
from app.storage.local import LocalCsvWordRepository  # noqa: E402
from app.storage.r2 import R2WordRepository  # noqa: E402


def build_repo(backend: str) -> WordRepository:
    settings = get_settings()
    if backend == "r2":
        missing = [n for n, v in {
            "R2_BUCKET": settings.r2_bucket,
            "R2_ENDPOINT_URL": settings.r2_endpoint_url,
            "R2_ACCESS_KEY_ID": settings.r2_access_key_id,
            "R2_SECRET_ACCESS_KEY": settings.r2_secret_access_key,
        }.items() if not v]
        if missing:
            print(f"[LỖI] Thiếu biến môi trường cho R2: {', '.join(missing)}", file=sys.stderr)
            sys.exit(1)
        return R2WordRepository(
            bucket=settings.r2_bucket,
            object_key=settings.wordbank_object_key,
            endpoint_url=settings.r2_endpoint_url,
            access_key_id=settings.r2_access_key_id,
            secret_access_key=settings.r2_secret_access_key,
            cache_ttl=0,
        )
    if backend == "d1":
        missing = [n for n, v in {
            "D1_ACCOUNT_ID": settings.d1_account_id,
            "D1_DATABASE_ID": settings.d1_database_id,
            "D1_API_TOKEN": settings.d1_api_token,
        }.items() if not v]
        if missing:
            print(f"[LỖI] Thiếu biến môi trường cho D1: {', '.join(missing)}", file=sys.stderr)
            sys.exit(1)
        return D1WordRepository(
            account_id=settings.d1_account_id,
            database_id=settings.d1_database_id,
            api_token=settings.d1_api_token,
            cache_ttl=0,
        )
    return LocalCsvWordRepository(path=settings.wordbank_local_path)


async def cmd_export(args: argparse.Namespace) -> None:
    repo = build_repo(args.backend)
    raw = await repo.load_raw_csv()
    entries = repo.parse_csv(raw)

    if not entries:
        print("[CẢNH BÁO] Word bank rỗng, file output sẽ là mảng trống.")

    # Nhóm theo topic — mỗi cặp (word, topic) ghép với 1 từ khác cùng topic làm "related"
    by_topic: dict[str, list] = {}
    for e in entries:
        by_topic.setdefault(e.topic, []).append(e)

    pairs = []
    seen: set[str] = set()

    for topic, items in by_topic.items():
        if len(items) < 2:
            print(f"[CẢNH BÁO] Chủ đề '{topic}' chỉ có 1 từ — bỏ qua, không thể tạo cặp.")
            continue
        for i, entry in enumerate(items):
            if entry.word in seen:
                continue
            # Lấy từ kế tiếp trong cùng topic làm "related"
            related = items[(i + 1) % len(items)]
            pairs.append({
                "real":    entry.word,
                "related": related.word,
                "hint":    entry.hints[0] if entry.hints else "",
                "meaning": entry.meaning,
            })
            seen.add(entry.word)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(pairs, f, ensure_ascii=False, indent=2)

    print(f"[OK] Đã export {len(pairs)} từ từ backend={args.backend} -> {args.out}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export word bank sang word_pairs.json cho app Android"
    )
    parser.add_argument(
        "--backend", choices=["local", "r2", "d1"], default="local",
        help="Nguồn dữ liệu (mặc định: local)",
    )
    parser.add_argument(
        "--out", default="word_pairs.json",
        help="Đường dẫn file JSON output (mặc định: word_pairs.json)",
    )
    parser.set_defaults(func=cmd_export)

    args = parser.parse_args()
    asyncio.run(args.func(args))


if __name__ == "__main__":
    main()