import {
  createDiscussionState,
  DEFAULT_CONFIG,
  isGameState,
  STATE_VERSION,
  type GameConfig,
  type GamePhase,
  type GameState,
  type Player,
  type Winner,
  type WordSelection,
} from "../core/game-state";

type StoredSnapshot = Record<string, unknown> & { version?: number };

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function migratePlayers(rawPlayers: unknown[]): Player[] {
  return rawPlayers.map((item, index) => {
    const raw = asRecord(item);
    const rawSecret = asRecord(raw.secret);
    const role = rawSecret.role === "imposter" ? "imposter" : rawSecret.role === "civilian" ? "civilian" : null;
    return {
      id: typeof raw.id === "string" ? raw.id : typeof raw.playerId === "string" ? raw.playerId : `legacy-player-${index + 1}`,
      name: typeof raw.name === "string" ? raw.name : `Người chơi ${index + 1}`,
      avatar: typeof raw.avatar === "string" ? raw.avatar : "◆",
      accent: typeof raw.accent === "string" ? raw.accent : typeof raw.color === "string" ? raw.color : "#7C5CFF",
      eliminated: raw.eliminated === true,
      secret: role ? {
        role,
        word: typeof rawSecret.word === "string" ? rawSecret.word : null,
        hint: typeof rawSecret.hint === "string" ? rawSecret.hint : null,
        meaning: typeof rawSecret.meaning === "string" ? rawSecret.meaning : null,
      } : null,
    };
  });
}

function migrateWordSelection(raw: Record<string, unknown>, fallbackMode: GameConfig["imposterWordMode"]): WordSelection | null {
  const civilianWord = typeof raw.civilianWord === "string" ? raw.civilianWord
    : typeof raw.realWord === "string" ? raw.realWord : null;
  if (!civilianWord) return null;
  return {
    pairId: typeof raw.pairId === "string" ? raw.pairId : `legacy-${civilianWord.toLocaleLowerCase("vi")}`,
    topic: typeof raw.topic === "string" ? raw.topic : "Khác",
    difficulty: raw.difficulty === "easy" || raw.difficulty === "hard" ? raw.difficulty : "medium",
    civilianWord,
    civilianMeaning: typeof raw.civilianMeaning === "string" ? raw.civilianMeaning
      : typeof raw.realMeaning === "string" ? raw.realMeaning : "",
    imposterWord: typeof raw.imposterWord === "string" ? raw.imposterWord : null,
    imposterHint: typeof raw.imposterHint === "string" ? raw.imposterHint : null,
    mode: raw.mode === "no-word" || raw.mode === "different-topic" || raw.mode === "similar" ? raw.mode : fallbackMode,
    source: raw.source === "pair" || raw.source === "topic-map" ? raw.source : "fallback",
  };
}

export function migrateStoredState(value: unknown, now = Date.now()): GameState | null {
  if (isGameState(value)) {
    const state = structuredClone(value);
    state.endedEarly = state.endedEarly === true;
    return state;
  }
  if (!value || typeof value !== "object") return null;
  const stored = value as StoredSnapshot;
  const rawPlayers = Array.isArray(stored.players) ? stored.players : [];
  if (!rawPlayers.length) return null;
  const players = migratePlayers(rawPlayers);
  const isV2 = stored.version === 2;
  const validPhases: GamePhase[] = ["setup", "reveal", "pass", "discussion", "vote", "elimination", "result"];
  const phase = isV2 && typeof stored.phase === "string" && validPhases.includes(stored.phase as GamePhase)
    ? stored.phase as GamePhase
    : phaseFromLegacy(stored.screen ?? stored.phase);
  const rawConfig = asRecord(stored.config);
  const imposterWordMode = rawConfig.imposterWordMode === "no-word" || rawConfig.imposterWordMode === "different-topic" || rawConfig.imposterWordMode === "similar"
    ? rawConfig.imposterWordMode
    : stored.imposterMode === "aware" ? "no-word"
      : stored.hiddenTopicMode === "different_topic" ? "different-topic" : "similar";
  const timerMinutes = typeof rawConfig.timerMinutes === "number" ? rawConfig.timerMinutes : 3;
  const config: GameConfig = {
    ...DEFAULT_CONFIG,
    imposterCount: typeof rawConfig.imposterCount === "number" ? rawConfig.imposterCount
      : typeof stored.numImposters === "number" ? stored.numImposters : 1,
    imposterWordMode,
    multiRound: typeof rawConfig.multiRound === "boolean" ? rawConfig.multiRound : stored.multiRound !== false,
    revealRoleOnElimination: typeof rawConfig.revealRoleOnElimination === "boolean"
      ? rawConfig.revealRoleOnElimination : stored.revealRoleMode !== false,
    timerEnabled: rawConfig.timerEnabled === true,
    timerMinutes,
    discussionSeconds: Math.max(30, Math.round(timerMinutes * 60)),
  };
  const legacyWinner: Winner = stored.winner === "civilian" || stored.winner === "imposter"
    ? stored.winner
    : stored.pendingWinner === "civilian" || stored.pendingWinner === "imposter" ? stored.pendingWinner : null;
  const gameOver = phase === "result" || stored.gameOver === true || stored.pendingGameOver === true || legacyWinner !== null;
  const rawLast = asRecord(stored.lastElimination);
  const lastEliminated = [...players].reverse().find((player) => player.eliminated && player.secret);
  const lastPlayerId = typeof rawLast.playerId === "string" ? rawLast.playerId : lastEliminated?.id;
  const lastPlayer = players.find((player) => player.id === lastPlayerId && player.secret);
  const lastElimination = phase === "elimination" && lastPlayer?.secret ? {
    playerId: lastPlayer.id,
    voteCount: typeof rawLast.voteCount === "number" && rawLast.voteCount > 0 ? rawLast.voteCount : null,
    role: lastPlayer.secret.role,
    gameOver,
    winner: legacyWinner,
  } : null;
  const rawVote = asRecord(stored.vote);
  const pendingTargetId = typeof rawVote.pendingTargetId === "string" ? rawVote.pendingTargetId : null;
  const currentIndex = typeof stored.revealIndex === "number" ? stored.revealIndex
    : typeof stored.currentPlayerIndex === "number" ? stored.currentPlayerIndex : 0;
  const discussion = createDiscussionState("open-floor");
  if (phase === "discussion" && config.timerEnabled) {
    discussion.timer.status = "paused";
    discussion.timer.pausedRemainingSeconds = config.discussionSeconds;
  }
  const round = typeof stored.round === "number" ? stored.round : 1;
  const wordRaw = Object.keys(asRecord(stored.wordSelection)).length ? asRecord(stored.wordSelection) : stored;
  return {
    version: STATE_VERSION,
    gameId: typeof stored.gameId === "string" ? stored.gameId : typeof stored.roomId === "string" ? stored.roomId : `legacy-${now}`,
    sessionId: `migrated-${now}`,
    phase,
    config,
    players,
    moderator: { enabled: false, name: null, handoffConfirmed: false },
    wordSelection: migrateWordSelection(wordRaw, imposterWordMode),
    revealIndex: Math.max(0, Math.min(players.length - 1, currentIndex)),
    revealedPlayerIds: Array.isArray(stored.revealedPlayerIds)
      ? stored.revealedPlayerIds.filter((id): id is string => typeof id === "string")
      : players.slice(0, currentIndex).map((player) => player.id),
    round,
    discussion,
    selection: { method: "consensus", selectedPlayerId: pendingTargetId },
    lastElimination,
    eliminationHistory: lastElimination ? [{
      round: Math.max(1, gameOver ? round : round - 1),
      playerId: lastElimination.playerId,
      role: lastElimination.role,
      displayedRole: config.revealRoleOnElimination || gameOver,
      selectionMethod: "consensus",
      voteCount: lastElimination.voteCount,
    }] : [],
    gameOver,
    winner: legacyWinner,
    endedEarly: false,
    createdAt: typeof stored.createdAt === "number" ? stored.createdAt : now,
    updatedAt: now,
  };
}
