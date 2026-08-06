from __future__ import annotations

import logging
import random
from dataclasses import dataclass, field
from typing import Optional

from app.models import (
    EliminationResult, HiddenTopicMode, ImposterMode, Player, PlayerSecret, Role,
    RoomConfig, RoomStateResponse, RoomStatus, WordEntry, new_id,
)
from app.storage.base import WordRepository

logger = logging.getLogger("game.engine")

PALETTE = ["#d4af6a", "#e0654f", "#4f8b8b", "#e8cf9c", "#f2a48f", "#8b93a6", "#c98a4b"]


class GameError(Exception):
    """Lỗi nghiệp vụ (sai trạng thái, sai quyền...) -> map sang HTTP 4xx ở router."""


@dataclass
class Room:
    id: str
    host_token: str
    config: RoomConfig = field(default_factory=RoomConfig)
    players: dict[str, Player] = field(default_factory=dict)
    status: RoomStatus = RoomStatus.lobby
    current_entry: Optional[WordEntry] = None  # từ thật (dân thường) ván này
    votes: dict[str, str] = field(default_factory=dict)
    winner: Optional[str] = None
    round_number: int = 1
    # Mỗi imposter được random riêng 1 từ cùng/khác chủ đề — lưu lại
    # để trả nhất quán mỗi lần hỏi trong cùng 1 ván.
    assigned_word: dict[str, str] = field(default_factory=dict)
    assigned_meaning: dict[str, str] = field(default_factory=dict)  # chỉ có khi assigned_word là 1 từ (không phải hint)

    def active_players(self) -> list[Player]:
        return [p for p in self.players.values() if not p.eliminated]

    def to_state(self) -> RoomStateResponse:
        return RoomStateResponse(
            room_id=self.id,
            status=self.status,
            config=self.config,
            players=[p.public() for p in self.players.values()],
            winner=self.winner,
            round_number=self.round_number,
        )


class RoomStore:
    def __init__(self):
        self._rooms: dict[str, Room] = {}

    def create(self) -> Room:
        room = Room(id=new_id(), host_token=new_id())
        self._rooms[room.id] = room
        logger.info("Tạo phòng mới: room_id=%s", room.id)
        return room

    def get(self, room_id: str) -> Room:
        room = self._rooms.get(room_id)
        if not room:
            logger.warning("Truy cập phòng không tồn tại: room_id=%s", room_id)
            raise GameError("Phòng không tồn tại")
        return room

    def delete(self, room_id: str) -> None:
        self._rooms.pop(room_id, None)
        logger.info("Xoá phòng: room_id=%s", room_id)


room_store = RoomStore()


class GameEngine:
    def __init__(self, word_repo: WordRepository):
        self.word_repo = word_repo

    # ---------- Lobby ----------

    def add_player(self, room: Room, name: str) -> Player:
        if room.status != RoomStatus.lobby:
            logger.warning("Từ chối join phòng đã bắt đầu: room_id=%s name=%r", room.id, name)
            raise GameError("Ván đấu đã bắt đầu, không thể tham gia thêm")
        color = PALETTE[len(room.players) % len(PALETTE)]
        is_host = len(room.players) == 0
        final_name = name.strip() or f"Người chơi {len(room.players)+1}"
        player = Player(name=final_name, color=color, is_host=is_host)
        room.players[player.id] = player
        logger.info("Người chơi tham gia: room_id=%s player_id=%s name=%r is_host=%s",
                    room.id, player.id, final_name, is_host)
        return player

    def rename_player(self, room: Room, player_id: str, token: str, new_name: str) -> Player:
        if room.status != RoomStatus.lobby:
            raise GameError("Không thể đổi tên khi ván đấu đang diễn ra")
        player = room.players.get(player_id)
        if not player or player.token != token:
            logger.warning("Đổi tên thất bại — xác thực sai: room_id=%s player_id=%s", room.id, player_id)
            raise GameError("Không xác thực được người chơi")
        old_name = player.name
        player.name = new_name.strip() or old_name
        logger.info("Người chơi đổi tên: room_id=%s player_id=%s %r -> %r",
                    room.id, player.id, old_name, player.name)
        return player

    def update_config(self, room: Room, config: RoomConfig) -> None:
        if room.status != RoomStatus.lobby:
            raise GameError("Không thể sửa cấu hình khi ván đấu đang diễn ra")
        max_imp = max(1, -(-len(room.players) // 2) - 1) if room.players else 1
        if config.num_imposters > max_imp:
            config.num_imposters = max_imp
        room.config = config
        logger.info("Cập nhật cấu hình: room_id=%s config=%s", room.id, config.model_dump())

    # ---------- Start / assign roles ----------

    async def start_game(self, room: Room) -> None:
        if len(room.players) < 3:
            raise GameError("Cần tối thiểu 3 người chơi")
        if room.status != RoomStatus.lobby:
            raise GameError("Ván đấu đã bắt đầu rồi")

        real_entry = await self.word_repo.get_random_entry()
        room.current_entry = real_entry
        room.assigned_word.clear()
        room.assigned_meaning.clear()

        player_ids = list(room.players.keys())
        random.shuffle(player_ids)

        n_imp = min(room.config.num_imposters, max(1, len(player_ids) - 1))
        imposter_ids = set(player_ids[:n_imp])

        role_log = []
        for pid, player in room.players.items():
            player.eliminated = False
            if pid in imposter_ids:
                player.role = Role.imposter
                if room.config.imposter_mode == ImposterMode.aware:
                    room.assigned_word[pid] = random.choice(real_entry.hints)
                else:
                    related = await self.word_repo.get_related_entry(
                        real_entry.topic, exclude_word=real_entry.word,
                        same_topic=(room.config.hidden_topic_mode == HiddenTopicMode.same_topic),
                    )
                    room.assigned_word[pid] = related.word
                    room.assigned_meaning[pid] = related.meaning
            else:
                player.role = Role.civilian
            role_log.append(f"{player.name}={player.role.value}")

        room.status = RoomStatus.in_progress
        room.round_number = 1
        room.votes.clear()
        room.winner = None

        logger.info("Ván đấu bắt đầu: room_id=%s tu_that=%s chu_de=%s imposter_mode=%s "
                    "multi_round=%s roles=[%s]",
                    room.id, real_entry.word, real_entry.topic,
                    room.config.imposter_mode.value, room.config.multi_round,
                    ", ".join(role_log))

    def get_player_secret(self, room: Room, player_id: str, token: str) -> PlayerSecret:
        player = room.players.get(player_id)
        if not player or player.token != token:
            logger.warning("Xem từ thất bại — xác thực sai: room_id=%s player_id=%s", room.id, player_id)
            raise GameError("Không xác thực được người chơi")
        if room.current_entry is None or player.role is None:
            raise GameError("Ván đấu chưa bắt đầu")

        entry = room.current_entry
        logger.debug("Người chơi xem từ: room_id=%s player_id=%s role=%s",
                     room.id, player.id, player.role.value)

        if player.role == Role.imposter:
            assigned = room.assigned_word.get(player.id)
            if room.config.imposter_mode == ImposterMode.aware:
                # Chế độ "biết mình là ai": chỉ nhận gợi ý, không nhận 1 "từ" thật sự
                # -> không có nghĩa để kèm theo.
                return PlayerSecret(
                    player_id=player.id, role=Role.imposter,
                    word=None, meaning=None, hint=assigned, is_imposter_aware=True,
                )
            # Chế độ ẩn danh: có nhận 1 từ thật sự -> kèm luôn giải thích nghĩa của từ đó.
            return PlayerSecret(
                player_id=player.id, role=Role.imposter,
                word=assigned, meaning=room.assigned_meaning.get(player.id),
                hint=None, is_imposter_aware=False,
            )
        return PlayerSecret(player_id=player.id, role=Role.civilian,
                             word=entry.word, meaning=entry.meaning, hint=None)

    # ---------- Voting ----------

    def cast_vote(self, room: Room, voter_id: str, target_id: str) -> None:
        if room.status != RoomStatus.in_progress:
            raise GameError("Chưa tới lúc bỏ phiếu")
        voter = room.players.get(voter_id)
        target = room.players.get(target_id)
        if not voter or voter.eliminated:
            raise GameError("Người bỏ phiếu không hợp lệ")
        if not target or target.eliminated:
            raise GameError("Người bị chọn không hợp lệ")
        room.votes[voter_id] = target_id
        logger.debug("Bỏ phiếu: room_id=%s %s -> %s", room.id, voter.name, target.name)

    def tally_and_eliminate(self, room: Room) -> EliminationResult:
        if not room.votes:
            raise GameError("Chưa có phiếu bầu nào")
        tally: dict[str, int] = {}
        for target_id in room.votes.values():
            tally[target_id] = tally.get(target_id, 0) + 1
        target_id = max(tally, key=tally.get)
        return self.eliminate_target(room, target_id)

    def eliminate_target(self, room: Room, target_id: str) -> EliminationResult:
        player = room.players.get(target_id)
        if not player or player.eliminated:
            raise GameError("Người chơi không hợp lệ để loại")

        player.eliminated = True
        was_imposter = player.role == Role.imposter

        active_imposters = sum(1 for p in room.players.values()
                                if p.role == Role.imposter and not p.eliminated)
        active_civilians = sum(1 for p in room.players.values()
                                if p.role == Role.civilian and not p.eliminated)

        if not room.config.multi_round:
            game_over, winner = True, ("civilian" if was_imposter else "imposter")
        elif active_imposters == 0:
            game_over, winner = True, "civilian"
        elif active_imposters >= active_civilians:
            game_over, winner = True, "imposter"
        else:
            game_over, winner = False, None

        entry = room.current_entry
        if player.role == Role.imposter:
            if room.config.imposter_mode == ImposterMode.aware:
                revealed_word = room.assigned_word.get(player.id, "")
                revealed_meaning = None  # đây là gợi ý, không phải 1 từ có nghĩa riêng
            else:
                revealed_word = room.assigned_word.get(player.id, "")
                revealed_meaning = room.assigned_meaning.get(player.id)
        else:
            revealed_word = entry.word
            revealed_meaning = entry.meaning

        room.votes.clear()
        if game_over:
            room.status = RoomStatus.finished
            room.winner = winner
        else:
            room.status = RoomStatus.in_progress
            room.round_number += 1

        logger.info(
            "Loại người chơi: room_id=%s player=%s role=%s was_imposter=%s "
            "round=%d game_over=%s winner=%s",
            room.id, player.name, player.role.value, was_imposter,
            room.round_number, game_over, winner,
        )

        return EliminationResult(
            eliminated_player_id=player.id,
            was_imposter=was_imposter,
            role_label="Kẻ giấu mặt" if was_imposter else "Dân thường",
            revealed_word=revealed_word,
            revealed_meaning=revealed_meaning,
            game_over=game_over,
            winner=winner,
        )

    # ---------- Reveal (chỉ sau khi kết thúc) ----------

    def reveal_all(self, room: Room):
        from app.models import RevealPlayer, RevealResponse

        if room.status != RoomStatus.finished or room.current_entry is None:
            raise GameError("Ván đấu chưa kết thúc, chưa thể lộ kết quả")

        entry = room.current_entry
        out: list[RevealPlayer] = []
        for p in room.players.values():
            if p.role == Role.imposter:
                word = room.assigned_word.get(p.id, "")
                meaning = (None if room.config.imposter_mode == ImposterMode.aware
                           else room.assigned_meaning.get(p.id))
            else:
                word = entry.word
                meaning = entry.meaning
            out.append(RevealPlayer(
                id=p.id, name=p.name, color=p.color, role=p.role,
                revealed_word=word, revealed_meaning=meaning, eliminated=p.eliminated,
            ))
        logger.info("Lộ kết quả cuối: room_id=%s winner=%s", room.id, room.winner)
        return RevealResponse(winner=room.winner, players=out)

    # ---------- Replay ----------

    def reset_for_replay(self, room: Room, keep_players: bool = True) -> None:
        room.status = RoomStatus.lobby
        room.current_entry = None
        room.votes.clear()
        room.winner = None
        room.round_number = 1
        room.assigned_word.clear()
        room.assigned_meaning.clear()
        if not keep_players:
            room.players.clear()
        else:
            for p in room.players.values():
                p.eliminated = False
                p.role = None
        logger.info("Reset phòng để chơi lại: room_id=%s keep_players=%s", room.id, keep_players)