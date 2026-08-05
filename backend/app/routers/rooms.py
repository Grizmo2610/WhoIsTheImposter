from __future__ import annotations

import functools

from fastapi import APIRouter, Depends, Header, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.game_engine import GameEngine, GameError, room_store
from app.models import (
    EliminationResult, Player, PlayerSecret, RevealResponse, RoomConfig,
    RoomStateResponse, VoteRequest,
)
from app.storage.base import WordRepository
from app.storage.factory import get_word_repository
from app.ws import manager

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


def get_engine(repo: WordRepository = Depends(get_word_repository)) -> GameEngine:
    return GameEngine(word_repo=repo)


def _err(fn):
    """Chuyển GameError -> HTTP 400 gọn, tránh lặp try/except ở mỗi route.
    functools.wraps giữ nguyên signature gốc để FastAPI vẫn đọc đúng
    query/body params khi inspect."""
    @functools.wraps(fn)
    async def wrapper(*args, **kwargs):
        try:
            return await fn(*args, **kwargs)
        except GameError as e:
            raise HTTPException(status_code=400, detail=str(e))
    return wrapper


class CreateRoomResponse(BaseModel):
    room_id: str
    host_token: str


class JoinRequest(BaseModel):
    name: str


class JoinResponse(BaseModel):
    player_id: str
    player_token: str


@router.post("", response_model=CreateRoomResponse)
async def create_room():
    room = room_store.create()
    return CreateRoomResponse(room_id=room.id, host_token=room.host_token)


@router.post("/{room_id}/players", response_model=JoinResponse)
@_err
async def join_room(room_id: str, body: JoinRequest, engine: GameEngine = Depends(get_engine)):
    room = room_store.get(room_id)
    player = engine.add_player(room, body.name)
    await manager.broadcast(room_id, room.to_state().model_dump(mode="json"))
    return JoinResponse(player_id=player.id, player_token=player.token)


@router.patch("/{room_id}/config", response_model=RoomStateResponse)
@_err
async def update_config(
    room_id: str, config: RoomConfig, x_host_token: str = Header(...),
    engine: GameEngine = Depends(get_engine),
):
    room = room_store.get(room_id)
    if x_host_token != room.host_token:
        raise HTTPException(status_code=403, detail="Chỉ chủ phòng mới được sửa cấu hình")
    engine.update_config(room, config)
    await manager.broadcast(room_id, room.to_state().model_dump(mode="json"))
    return room.to_state()


@router.post("/{room_id}/start", response_model=RoomStateResponse)
@_err
async def start_game(
    room_id: str, x_host_token: str = Header(...), engine: GameEngine = Depends(get_engine),
):
    room = room_store.get(room_id)
    if x_host_token != room.host_token:
        raise HTTPException(status_code=403, detail="Chỉ chủ phòng mới được bắt đầu ván")
    await engine.start_game(room)
    await manager.broadcast(room_id, room.to_state().model_dump(mode="json"))
    return room.to_state()


@router.get("/{room_id}/state", response_model=RoomStateResponse)
@_err
async def get_state(room_id: str):
    room = room_store.get(room_id)
    return room.to_state()


@router.get("/{room_id}/players/{player_id}/secret", response_model=PlayerSecret)
@_err
async def get_secret(
    room_id: str, player_id: str, x_player_token: str = Header(...),
    engine: GameEngine = Depends(get_engine),
):
    """Chỉ chủ token mới xem được từ/gợi ý của chính mình — server không
    bao giờ gửi từ của người khác xuống client, khác với bản thuần frontend."""
    room = room_store.get(room_id)
    return engine.get_player_secret(room, player_id, x_player_token)


@router.post("/{room_id}/vote", response_model=RoomStateResponse)
@_err
async def vote(room_id: str, body: VoteRequest, engine: GameEngine = Depends(get_engine)):
    room = room_store.get(room_id)
    engine.cast_vote(room, body.voter_id, body.target_id)
    await manager.broadcast(room_id, room.to_state().model_dump(mode="json"))
    return room.to_state()


@router.post("/{room_id}/eliminate/{target_id}", response_model=EliminationResult)
@_err
async def eliminate(
    room_id: str, target_id: str, x_host_token: str = Header(...),
    engine: GameEngine = Depends(get_engine),
):
    room = room_store.get(room_id)
    if x_host_token != room.host_token:
        raise HTTPException(status_code=403, detail="Chỉ chủ phòng mới được xác nhận loại")
    result = engine.eliminate_target(room, target_id)
    await manager.broadcast(room_id, {
        "type": "elimination", "result": result.model_dump(mode="json"),
        "state": room.to_state().model_dump(mode="json"),
    })
    return result


@router.post("/{room_id}/tally-eliminate", response_model=EliminationResult)
@_err
async def tally_eliminate(
    room_id: str, x_host_token: str = Header(...), engine: GameEngine = Depends(get_engine),
):
    """Thay vì host chọn tay, loại người có nhiều phiếu bầu nhất."""
    room = room_store.get(room_id)
    if x_host_token != room.host_token:
        raise HTTPException(status_code=403, detail="Chỉ chủ phòng mới được xác nhận loại")
    result = engine.tally_and_eliminate(room)
    await manager.broadcast(room_id, {
        "type": "elimination", "result": result.model_dump(mode="json"),
        "state": room.to_state().model_dump(mode="json"),
    })
    return result


@router.post("/{room_id}/reset", response_model=RoomStateResponse)
@_err
async def reset(
    room_id: str, keep_players: bool = True, x_host_token: str = Header(...),
    engine: GameEngine = Depends(get_engine),
):
    room = room_store.get(room_id)
    if x_host_token != room.host_token:
        raise HTTPException(status_code=403, detail="Chỉ chủ phòng mới được reset")
    engine.reset_for_replay(room, keep_players=keep_players)
    await manager.broadcast(room_id, room.to_state().model_dump(mode="json"))
    return room.to_state()


@router.get("/{room_id}/reveal", response_model=RevealResponse)
@_err
async def reveal(room_id: str, engine: GameEngine = Depends(get_engine)):
    room = room_store.get(room_id)
    return engine.reveal_all(room)


@router.websocket("/{room_id}/ws")
async def room_ws(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # client không cần gửi gì, giữ kết nối sống
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)