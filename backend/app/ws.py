from __future__ import annotations

from fastapi import WebSocket


class ConnectionManager:
    """Quản lý kết nối WS theo room_id để broadcast state mỗi khi có thay đổi
    (join, start, vote, eliminate...). Cho phép nhiều thiết bị cùng theo dõi
    1 phòng thay vì chỉ pass-and-play trên 1 máy."""

    def __init__(self):
        self._rooms: dict[str, set[WebSocket]] = {}

    async def connect(self, room_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._rooms.setdefault(room_id, set()).add(ws)

    def disconnect(self, room_id: str, ws: WebSocket) -> None:
        conns = self._rooms.get(room_id)
        if conns and ws in conns:
            conns.remove(ws)
        if conns is not None and not conns:
            self._rooms.pop(room_id, None)

    async def broadcast(self, room_id: str, payload: dict) -> None:
        conns = list(self._rooms.get(room_id, ()))
        for ws in conns:
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(room_id, ws)


manager = ConnectionManager()