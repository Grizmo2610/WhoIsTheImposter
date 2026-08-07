#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import get_settings  # noqa: E402
from app.models import WordEntry  # noqa: E402
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


async def cmd_add(args: argparse.Namespace) -> None:
    if len(args.hints) < 2:
        print(f"[CẢNH BÁO] '{args.word}' chỉ có {len(args.hints)} gợi ý — nên có >= 2.")

    repo = build_repo(args.backend)
    entries = repo.parse_csv(await repo.load_raw_csv())
    same_topic = sum(1 for e in entries if e.topic == args.topic)
    if same_topic == 0:
        print(f"[CẢNH BÁO] Chủ đề '{args.topic}' chưa có từ nào khác — imposter chọn "
              f"same_topic sẽ không có từ để nhận cho tới khi bạn thêm từ thứ 2 vào chủ đề này.")

    entry = WordEntry(word=args.word, topic=args.topic, hints=args.hints, meaning=args.meaning)
    await repo.append_entry(entry)
    print(f"[OK] Đã thêm '{args.word}' (chủ đề: {args.topic}, {len(args.hints)} gợi ý) "
          f"vào backend={args.backend}")


async def cmd_init_schema(args: argparse.Namespace) -> None:
    """Tạo bảng 'words' trên D1 nếu chưa có — chỉ cần chạy 1 lần trước khi dùng."""
    if args.backend != "d1":
        print("[LỖI] Lệnh init-schema chỉ dùng cho --backend d1", file=sys.stderr)
        sys.exit(1)
    repo = build_repo(args.backend)
    await repo.ensure_schema()
    print("[OK] Đã đảm bảo bảng 'words' tồn tại trên D1")


async def cmd_get(args: argparse.Namespace) -> None:
    repo = build_repo(args.backend)
    entry = await repo.get_entry(args.word)
    if entry is None:
        print(f"[LỖI] Không tìm thấy từ '{args.word}' trong backend={args.backend}", file=sys.stderr)
        sys.exit(1)
    print(f"word    : {entry.word}")
    print(f"topic   : {entry.topic}")
    print(f"hints   : {', '.join(entry.hints)}")
    print(f"meaning : {entry.meaning}")


async def cmd_update(args: argparse.Namespace) -> None:
    repo = build_repo(args.backend)
    old = await repo.get_entry(args.word)
    if old is None:
        print(f"[LỖI] Không tìm thấy từ '{args.word}' để sửa (backend={args.backend})", file=sys.stderr)
        sys.exit(1)

    new_entry = WordEntry(
        word=args.new_word or old.word,
        topic=args.topic or old.topic,
        hints=args.hints if args.hints else old.hints,
        meaning=args.meaning if args.meaning is not None else old.meaning,
    )
    ok = await repo.update_entry(args.word, new_entry)
    if not ok:
        print(f"[LỖI] Không sửa được từ '{args.word}'", file=sys.stderr)
        sys.exit(1)
    print(f"[OK] Đã sửa '{args.word}' -> '{new_entry.word}' (backend={args.backend})")


async def cmd_delete(args: argparse.Namespace) -> None:
    repo = build_repo(args.backend)
    if not args.yes:
        confirm = input(f"Xác nhận xóa từ '{args.word}' khỏi backend={args.backend}? (y/N): ")
        if confirm.strip().lower() != "y":
            print("Đã hủy.")
            return
    ok = await repo.delete_entry(args.word)
    if not ok:
        print(f"[LỖI] Không tìm thấy từ '{args.word}' để xóa", file=sys.stderr)
        sys.exit(1)
    print(f"[OK] Đã xóa '{args.word}' khỏi backend={args.backend}")


async def cmd_export(args: argparse.Namespace) -> None:
    """Tải toàn bộ CSV thô từ 1 backend (thường là r2) xuống file local."""
    repo = build_repo(args.backend)
    raw = await repo.load_raw_csv()
    with open(args.out, "w", encoding="utf-8", newline="") as f:
        f.write(raw)
    entries = repo.parse_csv(raw)
    print(f"[OK] Đã export {len(entries)} từ từ backend={args.backend} -> {args.out}")


async def cmd_import(args: argparse.Namespace) -> None:
    """Đẩy toàn bộ nội dung 1 file CSV local lên 1 backend (thường là r2).
    CẢNH BÁO: ghi đè toàn bộ dữ liệu hiện có trên backend đích."""
    with open(args.file, encoding="utf-8") as f:
        raw = f.read()

    entries = WordRepository.parse_csv(raw)  # validate trước khi ghi
    print(f"Đã đọc {len(entries)} từ từ '{args.file}'.")

    if not args.yes:
        confirm = input(f"Xác nhận GHI ĐÈ toàn bộ dữ liệu trên backend={args.backend}? (y/N): ")
        if confirm.strip().lower() != "y":
            print("Đã hủy.")
            return

    repo = build_repo(args.backend)
    await repo.save_raw_csv(raw)
    print(f"[OK] Đã import {len(entries)} từ lên backend={args.backend}")


async def cmd_list(args: argparse.Namespace) -> None:
    repo = build_repo(args.backend)
    raw = await repo.load_raw_csv()
    entries = repo.parse_csv(raw)
    if not entries:
        print("(word bank rỗng)")
        return

    by_topic: dict[str, list] = {}
    for e in entries:
        by_topic.setdefault(e.topic, []).append(e)

    for topic, items in by_topic.items():
        print(f"\n=== {topic} ({len(items)} từ) ===")
        for e in items:
            print(f"  - {e.word}")
            print(f"      nghĩa : {e.meaning}")
            print(f"      gợi ý: {', '.join(e.hints)}")
    print(f"\nTổng cộng: {len(entries)} từ, {len(by_topic)} chủ đề")


def main() -> None:
    parser = argparse.ArgumentParser(description="Quản lý word bank cho game Ai Là Người Giấu Mặt")
    parser.add_argument("--backend", choices=["local", "r2", "d1"], default="local",
                         help="Nguồn dữ liệu để thao tác (mặc định: local)")
    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init-schema", help="Tạo bảng 'words' trên D1 (chạy 1 lần đầu, chỉ dùng --backend d1)")
    p_init.set_defaults(func=cmd_init_schema)

    p_add = sub.add_parser("add", help="Thêm 1 từ mới")
    p_add.add_argument("--word", required=True, help="Từ (có thể là từ thật hoặc từ imposter tuỳ ván)")
    p_add.add_argument("--topic", required=True,
                        help="Chủ đề — imposter sẽ nhận 1 từ KHÁC cùng chủ đề này")
    p_add.add_argument("--hints", nargs="+", required=True,
                        help="Danh sách gợi ý về từ này (dùng ở chế độ Biết mình là ai)")
    p_add.add_argument("--meaning", required=True,
                        help="Giải thích nghĩa của từ — hiện kèm khi người chơi nhận được từ này")
    p_add.set_defaults(func=cmd_add)

    p_list = sub.add_parser("list", help="Xem toàn bộ word bank, nhóm theo chủ đề")
    p_list.set_defaults(func=cmd_list)

    p_get = sub.add_parser("get", help="Xem chi tiết 1 từ")
    p_get.add_argument("--word", required=True, help="Từ cần xem")
    p_get.set_defaults(func=cmd_get)

    p_update = sub.add_parser("update", help="Sửa 1 từ đã có (chỉ cần truyền field muốn đổi)")
    p_update.add_argument("--word", required=True, help="Từ hiện có cần sửa (dùng để tìm)")
    p_update.add_argument("--new-word", help="Đổi tên từ (bỏ trống nếu không đổi)")
    p_update.add_argument("--topic", help="Đổi chủ đề (bỏ trống nếu không đổi)")
    p_update.add_argument("--hints", nargs="+", help="Đổi danh sách gợi ý (bỏ trống nếu không đổi)")
    p_update.add_argument("--meaning", help="Đổi nghĩa (bỏ trống nếu không đổi)")
    p_update.set_defaults(func=cmd_update)

    p_delete = sub.add_parser("delete", help="Xóa 1 từ")
    p_delete.add_argument("--word", required=True, help="Từ cần xóa")
    p_delete.add_argument("-y", "--yes", action="store_true", help="Bỏ qua xác nhận")
    p_delete.set_defaults(func=cmd_delete)

    p_export = sub.add_parser("export", help="Tải CSV thô từ backend xuống file local")
    p_export.add_argument("--out", required=True, help="Đường dẫn file CSV để lưu")
    p_export.set_defaults(func=cmd_export)

    p_import = sub.add_parser("import", help="Đẩy 1 file CSV local lên backend (GHI ĐÈ toàn bộ)")
    p_import.add_argument("--file", required=True, help="Đường dẫn file CSV nguồn")
    p_import.add_argument("-y", "--yes", action="store_true", help="Bỏ qua xác nhận")
    p_import.set_defaults(func=cmd_import)

    args = parser.parse_args()
    asyncio.run(args.func(args))


if __name__ == "__main__":
    main()