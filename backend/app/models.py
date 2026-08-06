"""
Domain models — dùng chung cho cả game engine, API request/response
và (khi cần) tầng persistence.
"""
from __future__ import annotations

import uuid
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


def new_id() -> str:
    return uuid.uuid4().hex[:10]


class ImposterMode(str, Enum):
    aware = "aware"    # biết mình là ai, nhận gợi ý
    hidden = "hidden"  # ẩn danh, nhận từ gần giống


class RoomStatus(str, Enum):
    lobby = "lobby"
    in_progress = "in_progress"
    voting = "voting"
    elimination = "elimination"
    finished = "finished"


class Role(str, Enum):
    civilian = "civilian"
    imposter = "imposter"


class WordEntry(BaseModel):
    real: str
    related: list[str] = Field(default_factory=list)   # >= 1 từ liên quan (chế độ ẩn danh)
    hints: list[str] = Field(default_factory=list)      # >= 1 gợi ý (chế độ biết mình là ai)


class RoomConfig(BaseModel):
    num_imposters: int = Field(default=1, ge=1)
    imposter_mode: ImposterMode = ImposterMode.aware
    multi_round: bool = True
    timer_enabled: bool = False
    timer_minutes: int = Field(default=3, ge=1, le=15)


class Player(BaseModel):
    id: str = Field(default_factory=new_id)
    token: str = Field(default_factory=lambda: uuid.uuid4().hex)  # bí mật, xác thực client
    name: str
    color: str
    role: Optional[Role] = None
    eliminated: bool = False
    is_host: bool = False

    def public(self) -> "PlayerPublic":
        return PlayerPublic(
            id=self.id,
            name=self.name,
            color=self.color,
            eliminated=self.eliminated,
            is_host=self.is_host,
        )


class PlayerPublic(BaseModel):
    """Thông tin công khai — không lộ role/word."""
    id: str
    name: str
    color: str
    eliminated: bool
    is_host: bool


class PlayerSecret(BaseModel):
    """Chỉ trả về cho đúng chủ sở hữu token — dùng ở màn 'xem từ bí mật'."""
    player_id: str
    role: Role
    word: Optional[str] = None
    hint: Optional[str] = None
    is_imposter_aware: bool = False


class VoteRequest(BaseModel):
    voter_id: str
    target_id: str


class EliminationResult(BaseModel):
    eliminated_player_id: str
    was_imposter: bool
    role_label: str
    revealed_word: str
    game_over: bool
    winner: Optional[str] = None  # "civilian" | "imposter"


class RoomStateResponse(BaseModel):
    room_id: str
    status: RoomStatus
    config: RoomConfig
    players: list[PlayerPublic]
    winner: Optional[str] = None
    round_number: int = 1


class RevealPlayer(BaseModel):
    """Chỉ trả về sau khi ván đã kết thúc (status=finished) — an toàn để
    lộ role/word của TẤT CẢ người chơi cho màn kết quả cuối."""
    id: str
    name: str
    color: str
    role: Role
    revealed_word: str
    eliminated: bool


class RevealResponse(BaseModel):
    winner: Optional[str]
    players: list[RevealPlayer]