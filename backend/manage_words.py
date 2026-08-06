#!/usr/bin/env python3
"""
Script admin quản lý word bank — chạy độc lập, không cần khởi động server.

Ví dụ:
    # Thêm 1 từ mới vào CSV local
    python scripts/manage_words.py add \\
        --real "Phở" \\
        --related "Bún bò" "Bún riêu" "Hủ tiếu" \\
        --hints "Món nước, thường ăn sáng" "Có nước dùng đậm đà"

    # Thêm thẳng lên Cloudflare R2 (đọc cấu hình từ .env)
    python scripts/manage_words.py add --backend r2 --real "Sapa" --related "Đà Lạt" "Tam Đảo" --hints "Nơi có khí hậu mát mẻ"

    # Xem toàn bộ word bank hiện có
    python scripts/manage_words.py list
    python scripts/manage_words.py list --backend r2

Ràng buộc: mỗi từ cần >= 1 từ liên quan và >= 1 gợi ý; script sẽ cảnh báo
(không chặn) nếu bạn chỉ nhập đúng 1 giá trị — nên có ít nhất 2 để đa dạng
hoá lượt chơi (mỗi imposter được random 1 giá trị riêng trong danh sách).
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import get_settings  # noqa: E402
from app.models import WordEntry  # noqa: E402
from app.storage.base import WordRepository  # noqa: E402
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
            cache_ttl=0,  # script chạy 1 lần, không cần cache
        )
    return LocalCsvWordRepository(path=settings.wordbank_local_path)


async def cmd_add(args: argparse.Namespace) -> None:
    if len(args.related) < 2:
        print(f"[CẢNH BÁO] '{args.real}' chỉ có {len(args.related)} từ liên quan — nên có >= 2.")
    if len(args.hints) < 2:
        print(f"[CẢNH BÁO] '{args.real}' chỉ có {len(args.hints)} gợi ý — nên có >= 2.")

    repo = build_repo(args.backend)
    entry = WordEntry(real=args.real, related=args.related, hints=args.hints)
    await repo.append_entry(entry)
    print(f"[OK] Đã thêm '{args.real}' ({len(args.related)} từ liên quan, {len(args.hints)} gợi ý) "
          f"vào backend={args.backend}")


async def cmd_list(args: argparse.Namespace) -> None:
    repo = build_repo(args.backend)
    raw = await repo.load_raw_csv()
    entries = repo.parse_csv(raw)
    if not entries:
        print("(word bank rỗng)")
        return
    for i, e in enumerate(entries, 1):
        print(f"{i:>3}. {e.real}")
        print(f"     liên quan: {', '.join(e.related) or '(không có)'}")
        print(f"     gợi ý    : {', '.join(e.hints) or '(không có)'}")
    print(f"\nTổng cộng: {len(entries)} từ")


def main() -> None:
    parser = argparse.ArgumentParser(description="Quản lý word bank cho game Ai Là Người Giấu Mặt")
    parser.add_argument("--backend", choices=["local", "r2"], default="local",
                         help="Nguồn dữ liệu để thao tác (mặc định: local)")
    sub = parser.add_subparsers(dest="command", required=True)

    p_add = sub.add_parser("add", help="Thêm 1 từ mới")
    p_add.add_argument("--real", required=True, help="Từ thật (dân thường nhận)")
    p_add.add_argument("--related", nargs="+", required=True,
                        help="Danh sách từ liên quan (chế độ Ẩn danh) — nhập cách nhau bởi dấu cách")
    p_add.add_argument("--hints", nargs="+", required=True,
                        help="Danh sách gợi ý (chế độ Biết mình là ai) — nhập cách nhau bởi dấu cách")
    p_add.set_defaults(func=cmd_add)

    p_list = sub.add_parser("list", help="Xem toàn bộ word bank hiện có")
    p_list.set_defaults(func=cmd_list)

    args = parser.parse_args()
    asyncio.run(args.func(args))


if __name__ == "__main__":
    main()