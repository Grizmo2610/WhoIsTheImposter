/* ========================================================
   API client — toàn bộ giao tiếp với backend FastAPI ở đây.
   Đổi API_BASE nếu backend không chạy ở localhost:8000.
   ======================================================== */
const API_BASE = window.API_BASE_URL || 'http://127.0.0.1:8000';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError('Không kết nối được tới server. Kiểm tra backend đã chạy chưa?', 0);
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    const msg = (data && (data.detail || JSON.stringify(data))) || `Lỗi HTTP ${res.status}`;
    throw new ApiError(typeof msg === 'string' ? msg : JSON.stringify(msg), res.status);
  }
  return data;
}

const api = {
  createRoom: () => request('/api/rooms', { method: 'POST' }),

  joinRoom: (roomId, name) =>
    request(`/api/rooms/${roomId}/players`, { method: 'POST', body: { name } }),

  updateConfig: (roomId, hostToken, config) =>
    request(`/api/rooms/${roomId}/config`, {
      method: 'PATCH', body: config, headers: { 'X-Host-Token': hostToken },
    }),

  startGame: (roomId, hostToken) =>
    request(`/api/rooms/${roomId}/start`, {
      method: 'POST', headers: { 'X-Host-Token': hostToken },
    }),

  getSecret: (roomId, playerId, playerToken) =>
    request(`/api/rooms/${roomId}/players/${playerId}/secret`, {
      headers: { 'X-Player-Token': playerToken },
    }),

  eliminate: (roomId, hostToken, targetId) =>
    request(`/api/rooms/${roomId}/eliminate/${targetId}`, {
      method: 'POST', headers: { 'X-Host-Token': hostToken },
    }),

  getState: (roomId) => request(`/api/rooms/${roomId}/state`),

  reveal: (roomId) => request(`/api/rooms/${roomId}/reveal`),

  reset: (roomId, hostToken, keepPlayers) =>
    request(`/api/rooms/${roomId}/reset?keep_players=${keepPlayers}`, {
      method: 'POST', headers: { 'X-Host-Token': hostToken },
    }),
};