import {
  cloneState,
  createDiscussionState,
  createSelection,
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
import { normalizePlayerName, safeImposterCount, validatePlayerNames } from "../security/input-validator";

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
  moderatorName?: string | null;
  excludedPairIds?: readonly string[];
}

export class GameEngine {
  private state: GameState;
  private readonly random: RandomSource;
  private readonly now: () => number;
  private readonly excludedPairIds: readonly string[];

  constructor(
    private readonly words: WordRepository,
    playerNames: string[],
    config: Partial<GameConfig> = {},
    options: EngineOptions = {},
  ) {
    const names = validatePlayerNames(playerNames);
    this.random = options.random ?? Math.random;
    this.now = options.now ?? Date.now;
    this.excludedPairIds = options.excludedPairIds ?? [];
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
    mergedConfig.clueTurnSeconds = Math.max(10, Math.min(120, Math.trunc(mergedConfig.clueTurnSeconds)));
    mergedConfig.discussionSeconds = Math.max(30, Math.min(900, Math.trunc(mergedConfig.discussionSeconds)));
    mergedConfig.timerMinutes = Math.max(1, Math.round(mergedConfig.discussionSeconds / 60));
    const moderatorName = normalizePlayerName(options.moderatorName ?? "") || null;
    this.state = {
      version: STATE_VERSION,
      gameId: idFactory(),
      sessionId: idFactory(),
      phase: "setup",
      config: mergedConfig,
      players,
      moderator: {
        enabled: mergedConfig.moderatedDiscussionEnabled,
        name: mergedConfig.moderatedDiscussionEnabled ? moderatorName : null,
        handoffConfirmed: false,
      },
      wordSelection: null,
      revealIndex: 0,
      revealedPlayerIds: [],
      round: 1,
      discussion: createDiscussionState(),
      selection: createSelection(mergedConfig.selectionMethod),
      lastElimination: null,
      eliminationHistory: [],
      gameOver: false,
      winner: null,
      endedEarly: false,
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

  getGameState(): GameState { return cloneState(this.state); }

  getCurrentPlayer(): Player | null {
    return this.state.players[this.state.revealIndex] ? structuredClone(this.state.players[this.state.revealIndex]!) : null;
  }

  start(): GameState {
    if (this.state.phase !== "setup") throw new GameRuleError("GAME_ALREADY_STARTED");
    if (this.state.config.moderatedDiscussionEnabled && !this.state.moderator.name) {
      throw new GameRuleError("MODERATOR_NAME_REQUIRED");
    }
    const selection = this.words.select(this.state.config.imposterWordMode, this.random, {
      selectedTopics: this.state.config.selectedTopics,
      difficulty: this.state.config.difficulty,
      excludedPairIds: this.excludedPairIds,
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
    this.state.phase = "pass";
    return this.touch();
  }

  continueAfterPass(): GameState {
    if (this.state.phase !== "pass") throw new GameRuleError("NOT_PASS_PHASE");
    if (this.state.revealIndex < this.state.players.length - 1) {
      this.state.revealIndex += 1;
      this.state.phase = "reveal";
    } else {
      this.enterDiscussion(this.state.moderator.enabled ? "moderator-handoff" : "open-floor");
    }
    return this.touch();
  }

  confirmModeratorHandoff(): GameState {
    if (this.state.phase !== "discussion" || this.state.discussion.stage !== "moderator-handoff" || !this.state.moderator.enabled) {
      throw new GameRuleError("NOT_MODERATOR_HANDOFF");
    }
    this.state.moderator.handoffConfirmed = true;
    this.startClueRound(true);
    return this.touch();
  }

  advanceClueTurn(): GameState {
    if (this.state.phase !== "discussion" || this.state.discussion.stage !== "clue-round") {
      throw new GameRuleError("NOT_CLUE_ROUND");
    }
    const currentId = this.state.discussion.speakerOrder[this.state.discussion.speakerIndex];
    if (currentId && !this.state.discussion.completedSpeakerIds.includes(currentId)) {
      this.state.discussion.completedSpeakerIds.push(currentId);
    }
    if (this.state.discussion.speakerIndex < this.state.discussion.speakerOrder.length - 1) {
      this.state.discussion.speakerIndex += 1;
      this.state.discussion.clueTurnEndsAt = this.now() + this.state.config.clueTurnSeconds * 1000;
    } else {
      this.startOpenFloor();
    }
    return this.touch();
  }

  extendClueTurn(seconds = 10): GameState {
    if (this.state.phase !== "discussion" || this.state.discussion.stage !== "clue-round") {
      throw new GameRuleError("NOT_CLUE_ROUND");
    }
    this.state.discussion.clueTurnEndsAt = Math.max(this.now(), this.state.discussion.clueTurnEndsAt ?? this.now())
      + Math.max(1, seconds) * 1000;
    return this.touch();
  }

  pauseDiscussionTimer(): GameState {
    const timer = this.requireOpenFloorTimer();
    if (timer.status !== "running" || timer.endsAt === null) return this.getGameState();
    timer.pausedRemainingSeconds = Math.max(0, Math.ceil((timer.endsAt - this.now()) / 1000));
    timer.endsAt = null;
    timer.status = "paused";
    return this.touch();
  }

  resumeDiscussionTimer(): GameState {
    const timer = this.requireOpenFloorTimer();
    if (timer.status !== "paused") return this.getGameState();
    const remaining = Math.max(0, timer.pausedRemainingSeconds ?? this.state.config.discussionSeconds);
    timer.startedAt = this.now();
    timer.endsAt = this.now() + remaining * 1000;
    timer.pausedRemainingSeconds = null;
    timer.status = remaining > 0 ? "running" : "expired";
    return this.touch();
  }

  addDiscussionTime(seconds = 30): GameState {
    const timer = this.requireOpenFloorTimer();
    const extra = Math.max(1, seconds);
    if (timer.status === "running") timer.endsAt = Math.max(this.now(), timer.endsAt ?? this.now()) + extra * 1000;
    else if (timer.status === "paused") timer.pausedRemainingSeconds = (timer.pausedRemainingSeconds ?? 0) + extra;
    else {
      timer.status = "running";
      timer.startedAt = this.now();
      timer.endsAt = this.now() + extra * 1000;
      timer.pausedRemainingSeconds = null;
    }
    return this.touch();
  }

  startCooldown(seconds = 10): GameState {
    if (this.state.phase !== "discussion" || this.state.discussion.stage !== "open-floor") {
      throw new GameRuleError("NOT_OPEN_DISCUSSION");
    }
    const timer = this.state.discussion.timer;
    this.state.discussion.cooldownWasTimerRunning = timer.status === "running";
    if (timer.status === "running" && timer.endsAt !== null) {
      timer.pausedRemainingSeconds = Math.max(0, Math.ceil((timer.endsAt - this.now()) / 1000));
      timer.endsAt = null;
      timer.status = "paused";
    }
    this.state.discussion.cooldownEndsAt = this.now() + Math.max(1, seconds) * 1000;
    return this.touch();
  }

  tickDiscussion(): GameState {
    if (this.state.phase !== "discussion") return this.getGameState();
    const now = this.now();
    let changed = false;
    if (this.state.discussion.cooldownEndsAt !== null && now >= this.state.discussion.cooldownEndsAt) {
      this.state.discussion.cooldownEndsAt = null;
      if (this.state.discussion.cooldownWasTimerRunning) {
        const timer = this.state.discussion.timer;
        const remaining = Math.max(0, timer.pausedRemainingSeconds ?? 0);
        timer.status = remaining > 0 ? "running" : "expired";
        timer.startedAt = now;
        timer.endsAt = remaining > 0 ? now + remaining * 1000 : null;
        timer.pausedRemainingSeconds = null;
      }
      this.state.discussion.cooldownWasTimerRunning = false;
      changed = true;
    }
    const timer = this.state.discussion.timer;
    if (timer.status === "running" && timer.endsAt !== null && now >= timer.endsAt) {
      timer.status = "expired";
      timer.endsAt = null;
      timer.pausedRemainingSeconds = 0;
      changed = true;
    }
    return changed ? this.touch() : this.getGameState();
  }

  toggleSpeakingQueue(playerId: string): GameState {
    if (this.state.phase !== "discussion" || this.state.discussion.stage !== "open-floor") {
      throw new GameRuleError("NOT_OPEN_DISCUSSION");
    }
    const player = this.state.players.find((candidate) => candidate.id === playerId && !candidate.eliminated);
    if (!player) throw new GameRuleError("INVALID_QUEUE_PLAYER");
    const queue = this.state.discussion.speakingQueue;
    const index = queue.indexOf(playerId);
    if (index >= 0) queue.splice(index, 1);
    else queue.push(playerId);
    return this.touch();
  }

  advanceSpeakingQueue(): GameState {
    if (this.state.phase !== "discussion" || this.state.discussion.stage !== "open-floor") {
      throw new GameRuleError("NOT_OPEN_DISCUSSION");
    }
    this.state.discussion.currentQueuedSpeakerId = this.state.discussion.speakingQueue.shift() ?? null;
    return this.touch();
  }

  clearSpeakingQueue(): GameState {
    if (this.state.phase !== "discussion") throw new GameRuleError("NOT_DISCUSSION_PHASE");
    this.state.discussion.speakingQueue = [];
    this.state.discussion.currentQueuedSpeakerId = null;
    return this.touch();
  }

  beginVote(): GameState {
    if (this.state.phase !== "discussion" && this.state.phase !== "vote") throw new GameRuleError("NOT_DISCUSSION_PHASE");
    this.state.selection = createSelection(this.state.config.selectionMethod);
    this.state.phase = "vote";
    return this.touch();
  }

  selectVote(targetId: string | null): GameState {
    if (this.state.phase !== "vote" || this.state.selection.method !== "consensus") throw new GameRuleError("NOT_CONSENSUS_VOTE");
    if (targetId && !this.state.players.some((player) => player.id === targetId && !player.eliminated)) {
      throw new GameRuleError("INVALID_VOTE_TARGET");
    }
    this.state.selection.selectedPlayerId = targetId;
    return this.touch();
  }

  confirmVote(): GameState {
    if (this.state.phase !== "vote" || this.state.selection.method !== "consensus") throw new GameRuleError("NOT_CONSENSUS_VOTE");
    const targetId = this.state.selection.selectedPlayerId;
    const player = this.state.players.find((candidate) => candidate.id === targetId && !candidate.eliminated);
    if (!player?.secret) throw new GameRuleError("INVALID_VOTE_TARGET");
    const eliminatedRound = this.state.round;
    player.eliminated = true;
    const winner = determineWinner(this.state.players, this.state.config.multiRound, player.secret.role === "imposter");
    this.state.gameOver = winner !== null;
    this.state.winner = winner;
    this.state.lastElimination = {
      playerId: player.id,
      voteCount: null,
      role: player.secret.role,
      gameOver: this.state.gameOver,
      winner,
    };
    this.state.eliminationHistory.push({
      round: eliminatedRound,
      playerId: player.id,
      role: player.secret.role,
      displayedRole: this.state.config.revealRoleOnElimination || this.state.gameOver,
      selectionMethod: "consensus",
      voteCount: null,
    });
    if (!this.state.gameOver) this.state.round += 1;
    this.state.phase = "elimination";
    return this.touch();
  }

  endGameEarly(): GameState {
    if (this.state.phase === "setup" || this.state.phase === "result" || this.state.gameOver) {
      throw new GameRuleError("GAME_ALREADY_ENDED");
    }
    this.state.phase = "result";
    this.state.gameOver = true;
    this.state.winner = null;
    this.state.endedEarly = true;
    return this.touch();
  }

  continueFromElimination(): GameState {
    if (this.state.phase !== "elimination") throw new GameRuleError("NOT_ELIMINATION_PHASE");
    if (this.state.gameOver) this.state.phase = "result";
    else this.enterDiscussion(this.state.moderator.enabled ? "clue-round" : "open-floor");
    this.state.selection = createSelection(this.state.config.selectionMethod);
    return this.touch();
  }

  private enterDiscussion(stage: "moderator-handoff" | "clue-round" | "open-floor"): void {
    this.state.phase = "discussion";
    this.state.discussion = createDiscussionState(stage);
    if (stage === "clue-round") this.startClueRound(false);
    if (stage === "open-floor") this.startOpenFloor();
  }

  private startClueRound(randomizeStart: boolean): void {
    const alive = this.state.players.filter((player) => !player.eliminated).map((player) => player.id);
    if (!alive.length) throw new GameRuleError("NO_ACTIVE_PLAYERS");
    const offset = randomizeStart
      ? Math.min(alive.length - 1, Math.floor(Math.max(0, this.random()) * alive.length))
      : (this.state.round - 1) % alive.length;
    this.state.discussion.stage = "clue-round";
    this.state.discussion.speakerOrder = [...alive.slice(offset), ...alive.slice(0, offset)];
    this.state.discussion.speakerIndex = 0;
    this.state.discussion.completedSpeakerIds = [];
    this.state.discussion.clueTurnEndsAt = this.now() + this.state.config.clueTurnSeconds * 1000;
  }

  private startOpenFloor(): void {
    this.state.discussion.stage = "open-floor";
    this.state.discussion.clueTurnEndsAt = null;
    const timer = this.state.discussion.timer;
    if (this.state.config.timerEnabled) {
      timer.status = "running";
      timer.startedAt = this.now();
      timer.endsAt = this.now() + this.state.config.discussionSeconds * 1000;
      timer.pausedRemainingSeconds = null;
    } else {
      timer.status = "idle";
      timer.startedAt = null;
      timer.endsAt = null;
      timer.pausedRemainingSeconds = null;
    }
  }

  private requireOpenFloorTimer(): GameState["discussion"]["timer"] {
    if (this.state.phase !== "discussion" || this.state.discussion.stage !== "open-floor") {
      throw new GameRuleError("NOT_OPEN_DISCUSSION");
    }
    return this.state.discussion.timer;
  }

  private touch(): GameState {
    this.state.updatedAt = this.now();
    return this.getGameState();
  }
}
