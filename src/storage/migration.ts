import { DEFAULT_CONFIG, isGameState, STATE_VERSION, type GamePhase, type GameState, type Player, type Winner } from "../core/game-state";

type LegacySnapshot = Record<string, unknown> & { version?: number };

function phaseFromLegacy(screen: unknown): GamePhase {
  const map: Record<string, GamePhase> = {
    "screen-handover": "reveal",
    "screen-reveal": "reveal",
    "screen-discuss": "discussion",
    "screen-vote": "vote",
    "screen-elimination": "elimination",
    "screen-result": "result",
  };
  return typeof screen === "string" ? (map[screen] ?? "setup") : "setup";
}

export function migrateStoredState(value: unknown, now = Date.now()): GameState | null {
  if (isGameState(value)) return structuredClone(value);
  if (!value || typeof value !== "object") return null;
  const legacy = value as LegacySnapshot;
  const rawPlayers = Array.isArray(legacy.players) ? legacy.players : [];
  if (!rawPlayers.length) return null;
  const players: Player[] = rawPlayers.map((item, index) => {
    const raw = item as Record<string, unknown>;
    const rawSecret = raw.secret && typeof raw.secret === "object" ? raw.secret as Record<string, unknown> : null;
    const role = rawSecret?.role === "imposter" ? "imposter" : rawSecret?.role === "civilian" ? "civilian" : null;
    return {
      id: typeof raw.playerId === "string" ? raw.playerId : `legacy-player-${index + 1}`,
      name: typeof raw.name === "string" ? raw.name : `Người chơi ${index + 1}`,
      avatar: "◆",
      accent: typeof raw.color === "string" ? raw.color : "#7C5CFF",
      eliminated: raw.eliminated === true,
      secret: role ? {
        role,
        word: typeof rawSecret?.word === "string" ? rawSecret.word : null,
        hint: typeof rawSecret?.hint === "string" ? rawSecret.hint : null,
        meaning: typeof rawSecret?.meaning === "string" ? rawSecret.meaning : null,
      } : null,
    };
  });
  const phase = phaseFromLegacy(legacy.screen ?? legacy.phase);
  const currentIndex = typeof legacy.currentPlayerIndex === "number" ? legacy.currentPlayerIndex : 0;
  const legacyWinner: Winner = legacy.winner === "civilian" || legacy.winner === "imposter"
    ? legacy.winner
    : legacy.pendingWinner === "civilian" || legacy.pendingWinner === "imposter"
      ? legacy.pendingWinner
      : null;
  const gameOver = phase === "result" || legacy.pendingGameOver === true || legacyWinner !== null;
  const lastEliminated = [...players].reverse().find((player) => player.eliminated && player.secret);
  const lastElimination = phase === "elimination" && lastEliminated?.secret ? {
    playerId: lastEliminated.id,
    voteCount: 0,
    role: lastEliminated.secret.role,
    gameOver,
    winner: legacyWinner,
  } : null;
  const imposterWordMode = legacy.imposterMode === "aware"
    ? "no-word"
    : legacy.hiddenTopicMode === "different_topic"
      ? "different-topic"
      : "similar";
  return {
    version: STATE_VERSION,
    gameId: typeof legacy.roomId === "string" ? legacy.roomId : `legacy-${now}`,
    phase,
    config: {
      ...DEFAULT_CONFIG,
      imposterCount: typeof legacy.numImposters === "number" ? legacy.numImposters : 1,
      imposterWordMode,
      multiRound: legacy.multiRound !== false,
      revealRoleOnElimination: legacy.revealRoleMode !== false,
    },
    players,
    wordSelection: typeof legacy.realWord === "string" ? {
      civilianWord: legacy.realWord,
      civilianMeaning: typeof legacy.realMeaning === "string" ? legacy.realMeaning : "",
      imposterWord: null,
      imposterHint: null,
      mode: imposterWordMode,
      source: "fallback",
    } : null,
    revealIndex: Math.max(0, Math.min(players.length - 1, currentIndex)),
    revealedPlayerIds: players.slice(0, currentIndex).map((player) => player.id),
    round: typeof legacy.round === "number" ? legacy.round : 1,
    vote: { votes: {}, pendingTargetId: null },
    lastElimination,
    gameOver,
    winner: legacyWinner,
    createdAt: now,
    updatedAt: now,
  };
}
