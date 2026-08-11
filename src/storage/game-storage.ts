import type { GameState } from "../core/game-state";
import { migrateStoredState } from "./migration";

export const GAME_STORAGE_KEY = "who-is-the-imposter:game:v3";
export const V2_STORAGE_KEY = "who-is-the-imposter:game:v2";
export const LEGACY_STORAGE_KEY = "imposter_game_state_v1";
export const NAMES_STORAGE_KEY = "who-is-the-imposter:names";
export const WORD_HISTORY_STORAGE_KEY = "who-is-the-imposter:word-history";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class GameStorage {
  constructor(private readonly storage: StorageLike) {}

  save(state: GameState): boolean {
    try {
      this.storage.setItem(GAME_STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  load(): GameState | null {
    for (const key of [GAME_STORAGE_KEY, V2_STORAGE_KEY, LEGACY_STORAGE_KEY]) {
      try {
        const raw = this.storage.getItem(key);
        if (!raw) continue;
        const migrated = migrateStoredState(JSON.parse(raw));
        if (migrated) {
          if (key !== GAME_STORAGE_KEY) {
            this.save(migrated);
            this.storage.removeItem(key);
          }
          return migrated;
        }
      } catch {
        this.storage.removeItem(key);
      }
    }
    return null;
  }

  clear(): void {
    this.storage.removeItem(GAME_STORAGE_KEY);
    this.storage.removeItem(V2_STORAGE_KEY);
    this.storage.removeItem(LEGACY_STORAGE_KEY);
  }

  saveNames(names: string[]): void {
    try { this.storage.setItem(NAMES_STORAGE_KEY, JSON.stringify(names)); } catch { /* optional cache */ }
  }

  loadNames(): string[] {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(NAMES_STORAGE_KEY) ?? "[]");
      return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
    } catch {
      return [];
    }
  }

  loadWordHistory(): string[] {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(WORD_HISTORY_STORAGE_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(-50) : [];
    } catch {
      return [];
    }
  }

  rememberWord(pairId: string): void {
    try {
      const history = this.loadWordHistory().filter((id) => id !== pairId);
      history.push(pairId);
      this.storage.setItem(WORD_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-50)));
    } catch { /* optional cache */ }
  }
}
