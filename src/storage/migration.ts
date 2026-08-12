import {
  DEFAULT_CONFIG,
  isGameState,
  STATE_VERSION,
  type GameConfig,
  type GamePhase,
  type GameState,
  type ImposterWordMode,
  type Player,
  type PlayerSecret,
  type Winner,
} from "../core/game-state";
import { WORD_TOPICS, normalizeSelectedTopics } from "../data/word-topics";

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

  return typeof screen === "string"
    ? (map[screen] ?? "setup")
    : "setup";
}

function modeFromLegacy(
  value: unknown,
  hiddenTopicMode?: unknown,
): ImposterWordMode {
  if (value === "no-word" || value === "aware") {
    return "no-word";
  }

  if (
    value === "different-group" ||
    value === "different-topic" ||
    hiddenTopicMode === "different_topic"
  ) {
    return "different-group";
  }

  return "similar";
}

function secretFromUnknown(value: unknown): PlayerSecret | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;

  const role =
    raw.role === "imposter"
      ? "imposter"
      : raw.role === "civilian"
        ? "civilian"
        : null;

  if (!role) {
    return null;
  }

  return {
    role,
    word: typeof raw.word === "string" ? raw.word : null,
    hint: typeof raw.hint === "string" ? raw.hint : null,
  };
}

function playersFromUnknown(value: unknown): Player[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const raw =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {};

    return {
      id:
        typeof raw.id === "string"
          ? raw.id
          : typeof raw.playerId === "string"
            ? raw.playerId
            : `legacy-player-${index + 1}`,
      name:
        typeof raw.name === "string"
          ? raw.name
          : `Người chơi ${index + 1}`,
      avatar:
        typeof raw.avatar === "string"
          ? raw.avatar
          : "◆",
      accent:
        typeof raw.accent === "string"
          ? raw.accent
          : typeof raw.color === "string"
            ? raw.color
            : "#7C5CFF",
      eliminated: raw.eliminated === true,
      secret: secretFromUnknown(raw.secret),
    };
  });
}

function configFromUnknown(
  value: unknown,
  legacy: LegacySnapshot,
): GameConfig {
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const rawTopics = Array.isArray(raw.selectedTopics)
    ? normalizeSelectedTopics(raw.selectedTopics)
    : [...WORD_TOPICS];

  return {
    ...DEFAULT_CONFIG,
    imposterCount:
      typeof raw.imposterCount === "number"
        ? raw.imposterCount
        : typeof legacy.numImposters === "number"
          ? legacy.numImposters
          : 1,
    imposterWordMode: modeFromLegacy(
      raw.imposterWordMode ?? legacy.imposterMode,
      legacy.hiddenTopicMode,
    ),
    multiRound:
      typeof raw.multiRound === "boolean"
        ? raw.multiRound
        : legacy.multiRound !== false,
    revealRoleOnElimination:
      typeof raw.revealRoleOnElimination === "boolean"
        ? raw.revealRoleOnElimination
        : legacy.revealRoleMode !== false,
    timerEnabled: raw.timerEnabled === true,
    selectedTopics:
      rawTopics.length > 0
        ? rawTopics
        : [...WORD_TOPICS],
  };
}

export function migrateStoredState(
  value: unknown,
  now = Date.now(),
): GameState | null {
  if (isGameState(value)) {
    return structuredClone(value);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const legacy = value as LegacySnapshot;
  const players = playersFromUnknown(legacy.players);

  if (!players.length) {
    return null;
  }

  const config = configFromUnknown(legacy.config, legacy);

  const phase =
    typeof legacy.phase === "string" &&
    [
      "setup",
      "reveal",
      "pass",
      "discussion",
      "vote",
      "elimination",
      "result",
    ].includes(legacy.phase)
      ? (legacy.phase as GamePhase)
      : phaseFromLegacy(legacy.screen);

  const currentIndex =
    typeof legacy.revealIndex === "number"
      ? legacy.revealIndex
      : typeof legacy.currentPlayerIndex === "number"
        ? legacy.currentPlayerIndex
        : 0;

  const winner: Winner =
    legacy.winner === "civilian" ||
    legacy.winner === "imposter"
      ? legacy.winner
      : legacy.pendingWinner === "civilian" ||
          legacy.pendingWinner === "imposter"
        ? legacy.pendingWinner
        : null;

  const gameOver =
    legacy.gameOver === true ||
    phase === "result" ||
    legacy.pendingGameOver === true ||
    winner !== null;

  const rawElimination =
    legacy.lastElimination &&
    typeof legacy.lastElimination === "object"
      ? (legacy.lastElimination as Record<string, unknown>)
      : null;

  const lastEliminated = [...players]
    .reverse()
    .find(
      (player) =>
        player.eliminated && player.secret,
    );

  const eliminatedPlayerId =
    typeof rawElimination?.playerId === "string"
      ? rawElimination.playerId
      : lastEliminated?.id;

  const eliminatedPlayer = players.find(
    (player) =>
      player.id === eliminatedPlayerId &&
      player.secret,
  );

  const civilianSecret = players.find(
    (player) => player.secret?.role === "civilian",
  )?.secret;

  const civilianWord = civilianSecret?.word;

  const imposterSecrets = players
    .filter(
      (player) => player.secret?.role === "imposter",
    )
    .map((player) => player.secret!);

  return {
    version: STATE_VERSION,
    gameId:
      typeof legacy.gameId === "string"
        ? legacy.gameId
        : typeof legacy.roomId === "string"
          ? legacy.roomId
          : `legacy-${now}`,
    phase,
    config,
    players,

    wordSelection: civilianWord
      ? {
          civilianWord,
          civilianMeaning: null,
          imposterContents: imposterSecrets.map(
            (secret) => secret.word ?? secret.hint ?? "",
          ),
          hint:
            imposterSecrets.find(
              (secret) => secret.hint,
            )?.hint ?? null,
          mode: config.imposterWordMode,
          sourceGroupIds: [],
        }
      : null,

    revealIndex: Math.max(
      0,
      Math.min(players.length - 1, currentIndex),
    ),

    revealedPlayerIds: Array.isArray(
      legacy.revealedPlayerIds,
    )
      ? legacy.revealedPlayerIds.filter(
          (id): id is string => typeof id === "string",
        )
      : players
          .slice(0, currentIndex)
          .map((player) => player.id),

    discussionEndsAt:
      typeof legacy.discussionEndsAt === "number"
        ? legacy.discussionEndsAt
        : null,

    round:
      typeof legacy.round === "number"
        ? legacy.round
        : 1,

    vote:
      legacy.vote &&
      typeof legacy.vote === "object"
        ? (structuredClone(
            legacy.vote,
          ) as GameState["vote"])
        : {
            votes: {},
            pendingTargetId: null,
          },

    lastElimination: eliminatedPlayer?.secret
      ? {
          playerId: eliminatedPlayer.id,
          voteCount:
            typeof rawElimination?.voteCount ===
            "number"
              ? rawElimination.voteCount
              : 0,
          role: eliminatedPlayer.secret.role,
          gameOver,
          winner,
        }
      : null,

    gameOver,
    winner,

    createdAt:
      typeof legacy.createdAt === "number"
        ? legacy.createdAt
        : now,

    updatedAt:
      typeof legacy.updatedAt === "number"
        ? legacy.updatedAt
        : now,
  };
}