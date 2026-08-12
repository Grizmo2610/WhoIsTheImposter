import { WORD_TOPICS, isWordTopic, type WordTopic } from "../data/word-topics";

export const STATE_VERSION = 3 as const;

export type GamePhase =
  | "setup"
  | "reveal"
  | "pass"
  | "discussion"
  | "vote"
  | "elimination"
  | "result";

export type ImposterWordMode =
  | "similar"
  | "no-word"
  | "different-group";

export type Role = "civilian" | "imposter";
export type Winner = Role | null;

export interface GameConfig {
  imposterCount: number;
  imposterWordMode: ImposterWordMode;
  multiRound: boolean;
  revealRoleOnElimination: boolean;
  timerEnabled: boolean;
  selectedTopics: WordTopic[];
}

export interface PlayerSecret {
  role: Role;
  word: string | null;
  hint: string | null;
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
  civilianMeaning: string | null;
  imposterContents: string[];
  hint: string | null;
  mode: ImposterWordMode;
  sourceGroupIds: number[];
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
  discussionEndsAt: number | null;
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
  selectedTopics: [...WORD_TOPICS],
};

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;

  const state = value as Partial<GameState>;
  const phases: GamePhase[] = [
    "setup",
    "reveal",
    "pass",
    "discussion",
    "vote",
    "elimination",
    "result",
  ];
  const modes: ImposterWordMode[] = [
    "similar",
    "no-word",
    "different-group",
  ];

  return (
    state.version === STATE_VERSION &&
    typeof state.gameId === "string" &&
    !!state.config &&
    modes.includes(state.config.imposterWordMode) &&
    Array.isArray(state.config.selectedTopics) &&
    state.config.selectedTopics.every(isWordTopic) &&
    (!state.wordSelection ||
      (typeof state.wordSelection.civilianWord === "string" &&
        (state.wordSelection.civilianMeaning === null ||
          typeof state.wordSelection.civilianMeaning === "string") &&
        Array.isArray(state.wordSelection.imposterContents) &&
        Array.isArray(state.wordSelection.sourceGroupIds))) &&
    Array.isArray(state.players) &&
    typeof state.phase === "string" &&
    phases.includes(state.phase as GamePhase) &&
    typeof state.round === "number" &&
    (state.discussionEndsAt === null ||
      state.discussionEndsAt === undefined ||
      typeof state.discussionEndsAt === "number") &&
    !!state.vote
  );
}