"""
Game engine — logic thuần, tách khỏi FastAPI để dễ test và dễ thay
room store (memory -> redis) sau này mà không đụng vào luật chơi.

Server là nguồn sự thật duy nhất: từ/gợi ý của mỗi người chỉ trả về
cho đúng player đó (xác thực qua token), tránh client tự sửa state
như bản pass-and-play thuần frontend trước đây.
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional

from app.models import (
    EliminationResult, ImposterMode, Player, PlayerSecret, Role,
    RoomConfig, RoomStateResponse, RoomStatus, WordEntry, new_id,
)
from app.storage.base import WordRepository

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
    current_entry: Optional[WordEntry] = None
    votes: dict[str, str] = field(default_factory=dict)  # voter_id -> target_id
    winner: Optional[str] = None
    round_number: int = 1

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
    """Room store trong bộ nhớ tiến trình. Đủ dùng cho 1 instance.
    Khi cần scale nhiều instance / restart không mất state, thay lớp này
    bằng bản backed-by-Redis (giữ nguyên interface get/save/delete)."""

    def __init__(self):
        self._rooms: dict[str, Room] = {}

    def create(self) -> Room:
        room = Room(id=new_id(), host_token=new_id())
        self._rooms[room.id] = room
        return room

    def get(self, room_id: str) -> Room:
        room = self._rooms.get(room_id)
        if not room:
            raise GameError("Phòng không tồn tại")
        return room

    def delete(self, room_id: str) -> None:
        self._rooms.pop(room_id, None)


room_store = RoomStore()


class GameEngine:
    def __init__(self, word_repo: WordRepository):
        self.word_repo = word_repo

    # ---------- Lobby ----------

    def add_player(self, room: Room, name: str) -> Player:
        if room.status != RoomStatus.lobby:
            raise GameError("Ván đấu đã bắt đầu, không thể tham gia thêm")
        color = PALETTE[len(room.players) % len(PALETTE)]
        is_host = len(room.players) == 0
        player = Player(name=name.strip() or f"Người chơi {len(room.players)+1}",
                         color=color, is_host=is_host)
        room.players[player.id] = player
        return player

    def update_config(self, room: Room, config: RoomConfig) -> None:
        if room.status != RoomStatus.lobby:
            raise GameError("Không thể sửa cấu hình khi ván đấu đang diễn ra")
        max_imp = max(1, -(-len(room.players) // 2) - 1) if room.players else 1
        if config.num_imposters > max_imp:
            config.num_imposters = max_imp
        room.config = config

    # ---------- Start / assign roles ----------

    async def start_game(self, room: Room) -> None:
        if len(room.players) < 3:
            raise GameError("Cần tối thiểu 3 người chơi")
        if room.status != RoomStatus.lobby:
            raise GameError("Ván đấu đã bắt đầu rồi")

        entry = await self.word_repo.get_random_entry()
        room.current_entry = entry

        player_ids = list(room.players.keys())
        random.shuffle(player_ids)

        n_imp = min(room.config.num_imposters, max(1, len(player_ids) - 1))
        imposter_ids = set(player_ids[:n_imp])

        for pid, player in room.players.items():
            player.eliminated = False
            if pid in imposter_ids:
                player.role = Role.imposter
            else:
                player.role = Role.civilian

        room.status = RoomStatus.in_progress
        room.round_number = 1
        room.votes.clear()
        room.winner = None

    def get_player_secret(self, room: Room, player_id: str, token: str) -> PlayerSecret:
        player = room.players.get(player_id)
        if not player or player.token != token:
            raise GameError("Không xác thực được người chơi")
        if room.current_entry is None or player.role is None:
            raise GameError("Ván đấu chưa bắt đầu")

        entry = room.current_entry
        if player.role == Role.imposter:
            if room.config.imposter_mode == ImposterMode.aware:
                return PlayerSecret(
                    player_id=player.id, role=Role.imposter,
                    word=None, hint=entry.hint, is_imposter_aware=True,
                )
            return PlayerSecret(
                player_id=player.id, role=Role.imposter,
                word=entry.related, hint=None, is_imposter_aware=False,
            )
        return PlayerSecret(player_id=player.id, role=Role.civilian, word=entry.real, hint=None)

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

    def tally_and_eliminate(self, room: Room) -> EliminationResult:
        """Loại người có nhiều phiếu nhất (host cũng có thể gọi thủ công target_id riêng
        qua eliminate_target nếu app dùng cơ chế host-chọn thay vì tự động đếm phiếu)."""
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
        if player.role == Role.imposter and room.config.imposter_mode == ImposterMode.aware:
            revealed_word = entry.hint
        elif player.role == Role.imposter:
            revealed_word = entry.related
        else:
            revealed_word = entry.real

        room.votes.clear()
        if game_over:
            room.status = RoomStatus.finished
            room.winner = winner
        else:
            room.status = RoomStatus.in_progress
            room.round_number += 1

        return EliminationResult(
            eliminated_player_id=player.id,
            was_imposter=was_imposter,
            role_label="Kẻ giấu mặt" if was_imposter else "Dân thường",
            revealed_word=revealed_word,
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
            if p.role == Role.imposter and room.config.imposter_mode == ImposterMode.aware:
                word = entry.hint
            elif p.role == Role.imposter:
                word = entry.related
            else:
                word = entry.real
            out.append(RevealPlayer(
                id=p.id, name=p.name, color=p.color, role=p.role,
                revealed_word=word, eliminated=p.eliminated,
            ))
        return RevealResponse(winner=room.winner, players=out)

    # ---------- Replay ----------

    def reset_for_replay(self, room: Room, keep_players: bool = True) -> None:
        room.status = RoomStatus.lobby
        room.current_entry = None
        room.votes.clear()
        room.winner = None
        room.round_number = 1
        if not keep_players:
            room.players.clear()
        else:
            for p in room.players.values():
                p.eliminated = False
                p.role = None