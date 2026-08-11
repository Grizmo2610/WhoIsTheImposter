export const STATE_VERSION = 3 as const;

export type GamePhase =
  | "setup"
  | "reveal"
  | "pass"
  | "discussion"
  | "vote"
  | "elimination"
  | "result";

export type ImposterWordMode = "similar" | "no-word" | "different-topic";
export type Role = "civilian" | "imposter";
export type Winner = Role | null;
export type SelectionMethod = "consensus" | "secret-pass";
export type Difficulty = "any" | "easy" | "medium" | "hard";
export type DiscussionStage = "moderator-handoff" | "clue-round" | "open-floor";

export interface GameConfig {
  imposterCount: number;
  imposterWordMode: ImposterWordMode;
  multiRound: boolean;
  revealRoleOnElimination: boolean;
  timerEnabled: boolean;
  timerMinutes: number;
  moderatedDiscussionEnabled: boolean;
  clueTurnSeconds: number;
  discussionSeconds: number;
  discussionGuideEnabled: boolean;
  selectionMethod: SelectionMethod;
  selectedTopics: string[];
  difficulty: Difficulty;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  tapToReveal: boolean;
}

export interface PlayerSecret {
  role: Role;
  word: string | null;
  hint: string | null;
  meaning: string | null;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  accent: string;
  eliminated: boolean;
  secret: PlayerSecret | null;
}

export interface WordSelection {
  pairId: string;
  topic: string;
  difficulty: Exclude<Difficulty, "any">;
  civilianWord: string;
  civilianMeaning: string;
  imposterWord: string | null;
  imposterHint: string | null;
  mode: ImposterWordMode;
  source: "pair" | "topic-map" | "fallback";
}

export interface ModeratorState {
  enabled: boolean;
  name: string | null;
  handoffConfirmed: boolean;
}

export interface DiscussionTimerState {
  status: "idle" | "running" | "paused" | "expired";
  startedAt: number | null;
  endsAt: number | null;
  pausedRemainingSeconds: number | null;
}

export interface DiscussionState {
  stage: DiscussionStage;
  speakerOrder: string[];
  speakerIndex: number;
  completedSpeakerIds: string[];
  speakingQueue: string[];
  currentQueuedSpeakerId: string | null;
  clueTurnEndsAt: number | null;
  cooldownEndsAt: number | null;
  cooldownWasTimerRunning: boolean;
  timer: DiscussionTimerState;
}

export interface ConsensusSelection {
  method: "consensus";
  selectedPlayerId: string | null;
}

export interface SecretBallotSelection {
  method: "secret-pass";
  voterOrder: string[];
  voterIndex: number;
  votes: Record<string, string>;
  runoffCandidateIds: string[];
}

export type GameSelection = ConsensusSelection | SecretBallotSelection;

export interface EliminationResult {
  playerId: string;
  voteCount: number | null;
  role: Role;
  gameOver: boolean;
  winner: Winner;
}

export interface EliminationHistoryItem {
  round: number;
  playerId: string;
  role: Role;
  displayedRole: boolean;
  selectionMethod: SelectionMethod;
  voteCount: number | null;
}

export interface GameState {
  version: typeof STATE_VERSION;
  gameId: string;
  sessionId: string;
  phase: GamePhase;
  config: GameConfig;
  players: Player[];
  moderator: ModeratorState;
  wordSelection: WordSelection | null;
  revealIndex: number;
  revealedPlayerIds: string[];
  round: number;
  discussion: DiscussionState;
  selection: GameSelection;
  lastElimination: EliminationResult | null;
  eliminationHistory: EliminationHistoryItem[];
  gameOver: boolean;
  winner: Winner;
  endedEarly: boolean;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  imposterCount: 1,
  imposterWordMode: "similar",
  multiRound: true,
  revealRoleOnElimination: true,
  timerEnabled: false,
  timerMinutes: 3,
  moderatedDiscussionEnabled: false,
  clueTurnSeconds: 30,
  discussionSeconds: 180,
  discussionGuideEnabled: true,
  selectionMethod: "consensus",
  selectedTopics: [],
  difficulty: "any",
  soundEnabled: true,
  hapticsEnabled: true,
  tapToReveal: false,
};

export function createDiscussionState(stage: DiscussionStage = "open-floor"): DiscussionState {
  return {
    stage,
    speakerOrder: [],
    speakerIndex: 0,
    completedSpeakerIds: [],
    speakingQueue: [],
    currentQueuedSpeakerId: null,
    clueTurnEndsAt: null,
    cooldownEndsAt: null,
    cooldownWasTimerRunning: false,
    timer: { status: "idle", startedAt: null, endsAt: null, pausedRemainingSeconds: null },
  };
}

export function createSelection(method: SelectionMethod = "consensus"): GameSelection {
  return method === "secret-pass"
    ? { method, voterOrder: [], voterIndex: 0, votes: {}, runoffCandidateIds: [] }
    : { method, selectedPlayerId: null };
}

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GameState>;
  const phases: GamePhase[] = ["setup", "reveal", "pass", "discussion", "vote", "elimination", "result"];
  return state.version === STATE_VERSION
    && typeof state.gameId === "string"
    && typeof state.sessionId === "string"
    && !!state.config
    && Array.isArray(state.players)
    && !!state.moderator
    && !!state.discussion
    && !!state.selection
    && Array.isArray(state.eliminationHistory)
    && typeof state.phase === "string"
    && phases.includes(state.phase as GamePhase)
    && typeof state.round === "number";
}
