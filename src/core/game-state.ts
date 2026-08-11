export const STATE_VERSION = 2 as const;

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

export interface GameConfig {
  imposterCount: number;
  imposterWordMode: ImposterWordMode;
  multiRound: boolean;
  revealRoleOnElimination: boolean;
  timerEnabled: boolean;
  timerMinutes: number;
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
  civilianWord: string;
  civilianMeaning: string;
  imposterWord: string | null;
  imposterHint: string | null;
  mode: ImposterWordMode;
  source: "pair" | "topic-map" | "fallback";
}

export interface EliminationResult {
  playerId: string;
  voteCount: number;
  role: Role;
  gameOver: boolean;
  winner: Winner;
}

export interface VoteState {
  votes: Record<string, string>;
  pendingTargetId: string | null;
}

export interface GameState {
  version: typeof STATE_VERSION;
  gameId: string;
  phase: GamePhase;
  config: GameConfig;
  players: Player[];
  wordSelection: WordSelection | null;
  revealIndex: number;
  revealedPlayerIds: string[];
  round: number;
  vote: VoteState;
  lastElimination: EliminationResult | null;
  gameOver: boolean;
  winner: Winner;
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
};

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GameState>;
  const phases: GamePhase[] = ["setup", "reveal", "pass", "discussion", "vote", "elimination", "result"];
  return state.version === STATE_VERSION
    && typeof state.gameId === "string"
    && !!state.config
    && Array.isArray(state.players)
    && typeof state.phase === "string"
    && phases.includes(state.phase as GamePhase)
    && typeof state.round === "number"
    && !!state.vote;
}
