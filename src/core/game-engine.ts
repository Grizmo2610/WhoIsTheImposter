import {
  cloneState,
  DEFAULT_CONFIG,
  isGameState,
  STATE_VERSION,
  type GameConfig,
  type GameState,
  type Player,
} from "./game-state";
import { assignRoles, chooseImposterIndexes } from "./role-engine";
import { determineWinner } from "./win-condition";
import type { RandomSource } from "../data/random";
import type { WordGroup } from "../data/word-database";
import { selectGameWords } from "../data/word-selector";
import { normalizeSelectedTopics } from "../data/word-topics";
import { safeImposterCount, validatePlayerNames } from "../security/input-validator";
import { discussionDurationSeconds } from "./discussion-timer";

const AVATARS = ["◆", "●", "▲", "■", "★", "⬟", "✦", "⬢", "◈", "✺", "⬣", "✹"];
const ACCENTS = ["#22D3EE", "#FF6B6B", "#FACC15", "#34D399", "#A78BFA", "#F472B6", "#FB923C", "#60A5FA"];

export class GameRuleError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "GameRuleError";
  }
}

export interface EngineOptions {
  random?: RandomSource;
  now?: () => number;
  idFactory?: () => string;
}

export class GameEngine {
  private state: GameState;
  private readonly random: RandomSource;
  private readonly now: () => number;

  constructor(
    private readonly database: readonly WordGroup[],
    playerNames: string[],
    config: Partial<GameConfig> = {},
    options: EngineOptions = {},
  ) {
    const names = validatePlayerNames(playerNames);
    this.random = options.random ?? Math.random;
    this.now = options.now ?? Date.now;
    const idFactory = options.idFactory ?? (() => crypto.randomUUID());
    const timestamp = this.now();
    const players: Player[] = names.map((name, index) => ({
      id: idFactory(),
      name,
      avatar: AVATARS[index % AVATARS.length]!,
      accent: ACCENTS[index % ACCENTS.length]!,
      eliminated: false,
      secret: null,
    }));
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    mergedConfig.imposterCount = safeImposterCount(players.length, mergedConfig.imposterCount);
    mergedConfig.selectedTopics = normalizeSelectedTopics(mergedConfig.selectedTopics);
    this.state = {
      version: STATE_VERSION,
      gameId: idFactory(),
      phase: "setup",
      config: mergedConfig,
      players,
      wordSelection: null,
      revealIndex: 0,
      revealedPlayerIds: [],
      discussionEndsAt: null,
      round: 1,
      vote: { votes: {}, pendingTargetId: null },
      lastElimination: null,
      gameOver: false,
      winner: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  static restore(database: readonly WordGroup[], state: GameState, options: EngineOptions = {}): GameEngine {
    if (!isGameState(state)) throw new GameRuleError("INVALID_STATE");
    const engine = new GameEngine(database, state.players.map((player) => player.name), state.config, options);
    engine.state = cloneState(state);
    engine.state.discussionEndsAt ??= engine.state.phase === "discussion" && engine.state.config.timerEnabled
      ? engine.now() + discussionDurationSeconds(engine.alivePlayerCount()) * 1000
      : null;
    return engine;
  }

  getGameState(): GameState {
    return cloneState(this.state);
  }

  getCurrentPlayer(): Player | null {
    return this.state.players[this.state.revealIndex] ? structuredClone(this.state.players[this.state.revealIndex]!) : null;
  }

  start(): GameState {
    if (this.state.phase !== "setup") throw new GameRuleError("GAME_ALREADY_STARTED");
    const selection = selectGameWords({
      database: this.database,
      selectedTopics: this.state.config.selectedTopics,
      mode: this.state.config.imposterWordMode,
      imposterCount: this.state.config.imposterCount,
      random: this.random,
    });
    const indexes = chooseImposterIndexes(this.state.players.length, this.state.config.imposterCount, this.random);
    this.state.players = assignRoles(this.state.players, indexes, selection);
    this.state.wordSelection = selection;
    this.state.phase = "reveal";
    return this.touch();
  }

  markRoleSeen(): GameState {
    if (this.state.phase !== "reveal") throw new GameRuleError("NOT_REVEAL_PHASE");
    const player = this.state.players[this.state.revealIndex];
    if (!player) throw new GameRuleError("PLAYER_NOT_FOUND");
    if (!this.state.revealedPlayerIds.includes(player.id)) this.state.revealedPlayerIds.push(player.id);
    if (this.state.revealIndex < this.state.players.length - 1) {
      this.state.revealIndex += 1;
      this.state.phase = "reveal";
    } else {
      this.state.phase = "discussion";
      this.startDiscussionTimer();
    }
    return this.touch();
  }

  /** Advances version-2 snapshots saved on the retired handoff screen. */
  continueAfterPass(): GameState {
    if (this.state.phase !== "pass") throw new GameRuleError("NOT_PASS_PHASE");
    if (this.state.revealIndex < this.state.players.length - 1) {
      this.state.revealIndex += 1;
      this.state.phase = "reveal";
    } else {
      this.state.phase = "discussion";
      this.startDiscussionTimer();
    }
    return this.touch();
  }

  beginVote(): GameState {
    if (this.state.phase !== "discussion" && this.state.phase !== "vote") throw new GameRuleError("NOT_DISCUSSION_PHASE");
    this.state.vote = { votes: {}, pendingTargetId: null };
    this.state.phase = "vote";
    this.state.discussionEndsAt = null;
    return this.touch();
  }

  selectVote(targetId: string | null): GameState {
    if (this.state.phase !== "vote") throw new GameRuleError("NOT_VOTE_PHASE");
    if (targetId && !this.state.players.some((player) => player.id === targetId && !player.eliminated)) {
      throw new GameRuleError("INVALID_VOTE_TARGET");
    }
    this.state.vote.pendingTargetId = targetId;
    return this.touch();
  }

  confirmVote(): GameState {
    if (this.state.phase !== "vote") throw new GameRuleError("NOT_VOTE_PHASE");
    const targetId = this.state.vote.pendingTargetId;
    const player = this.state.players.find((candidate) => candidate.id === targetId && !candidate.eliminated);
    if (!player || !player.secret) throw new GameRuleError("INVALID_VOTE_TARGET");
    const voteCount = this.state.players.filter((candidate) => !candidate.eliminated).length;
    this.state.vote.votes = Object.fromEntries(
      this.state.players.filter((candidate) => !candidate.eliminated).map((candidate) => [candidate.id, player.id]),
    );
    player.eliminated = true;
    const winner = determineWinner(this.state.players, this.state.config.multiRound, player.secret.role === "imposter");
    this.state.gameOver = winner !== null;
    this.state.winner = winner;
    this.state.lastElimination = {
      playerId: player.id,
      voteCount,
      role: player.secret.role,
      gameOver: this.state.gameOver,
      winner,
    };
    if (!this.state.gameOver) this.state.round += 1;
    this.state.phase = "elimination";
    return this.touch();
  }

  continueFromElimination(): GameState {
    if (this.state.phase !== "elimination") throw new GameRuleError("NOT_ELIMINATION_PHASE");
    this.state.phase = this.state.gameOver ? "result" : "discussion";
    this.state.vote = { votes: {}, pendingTargetId: null };
    if (!this.state.gameOver) this.startDiscussionTimer();
    return this.touch();
  }

  private alivePlayerCount(): number {
    return this.state.players.filter((player) => !player.eliminated).length;
  }

  private startDiscussionTimer(): void {
    this.state.discussionEndsAt = this.state.config.timerEnabled
      ? this.now() + discussionDurationSeconds(this.alivePlayerCount()) * 1000
      : null;
  }

  private touch(): GameState {
    this.state.updatedAt = this.now();
    return this.getGameState();
  }
}
