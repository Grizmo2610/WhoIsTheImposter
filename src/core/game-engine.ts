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
import type { RandomSource } from "../data/word-repository";
import { WordRepository } from "../data/word-repository";
import { safeImposterCount, validatePlayerNames } from "../security/input-validator";

const AVATARS = ["◆", "●", "▲", "■", "★", "⬟", "✦", "⬢", "◈", "✺", "⬣", "✹"];
const ACCENTS = ["#38D8FF", "#FF9A3D", "#FF66B3", "#58E6A9", "#A98BFF", "#F7D154", "#5F8CFF", "#FF6B78"];

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
    private readonly words: WordRepository,
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
    this.state = {
      version: STATE_VERSION,
      gameId: idFactory(),
      phase: "setup",
      config: mergedConfig,
      players,
      wordSelection: null,
      revealIndex: 0,
      revealedPlayerIds: [],
      round: 1,
      vote: { votes: {}, pendingTargetId: null },
      lastElimination: null,
      gameOver: false,
      winner: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  static restore(words: WordRepository, state: GameState, options: EngineOptions = {}): GameEngine {
    if (!isGameState(state)) throw new GameRuleError("INVALID_STATE");
    const engine = new GameEngine(words, state.players.map((player) => player.name), state.config, options);
    engine.state = cloneState(state);
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
    const selection = this.words.select(this.state.config.imposterWordMode, this.random);
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
    this.state.phase = "pass";
    return this.touch();
  }

  continueAfterPass(): GameState {
    if (this.state.phase !== "pass") throw new GameRuleError("NOT_PASS_PHASE");
    if (this.state.revealIndex < this.state.players.length - 1) {
      this.state.revealIndex += 1;
      this.state.phase = "reveal";
    } else {
      this.state.phase = "discussion";
    }
    return this.touch();
  }

  beginVote(): GameState {
    if (this.state.phase !== "discussion" && this.state.phase !== "vote") throw new GameRuleError("NOT_DISCUSSION_PHASE");
    this.state.vote = { votes: {}, pendingTargetId: null };
    this.state.phase = "vote";
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
    return this.touch();
  }

  private touch(): GameState {
    this.state.updatedAt = this.now();
    return this.getGameState();
  }
}
