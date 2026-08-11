import { describe, expect, it } from "vitest";
import { normalizePlayerName, PlayerValidationError, validatePlayerNames } from "../../src/security/input-validator";
import { migrateStoredState } from "../../src/storage/migration";
import { GameStorage, GAME_STORAGE_KEY } from "../../src/storage/game-storage";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
}

describe("player validation and XSS regression", () => {
  it("keeps HTML payload as literal text data instead of parsing it", () => {
    const payload = '<img src=x onerror=alert(1)>';
    const normalized = normalizePlayerName(payload);
    expect(normalized).toBe(payload.slice(0, 20));
    expect(normalized).not.toContain("\u0000");
  });

  it("trims names, removes control characters and rejects duplicates", () => {
    expect(normalizePlayerName("  An\u0000  Nguyen  ")).toBe("An Nguyen");
    expect(() => validatePlayerNames(["An", " an ", "Bình"])).toThrowError(PlayerValidationError);
  });
});

describe("state storage and migration", () => {
  it("migrates a legacy elimination screen without losing players", () => {
    const migrated = migrateStoredState({
      roomId: "old-room",
      screen: "screen-elimination",
      numImposters: 1,
      players: [
        { playerId: "a", name: "An", color: "#fff", eliminated: true, secret: { role: "civilian", word: "Phở" } },
        { playerId: "b", name: "Bình", color: "#000", eliminated: false, secret: { role: "imposter", word: "Bún bò" } },
      ],
    }, 123);
    expect(migrated?.version).toBe(2);
    expect(migrated?.phase).toBe("elimination");
    expect(migrated?.players[0]?.eliminated).toBe(true);
    expect(migrated?.lastElimination?.playerId).toBe("a");
  });

  it("discards corrupted JSON instead of crashing", () => {
    const memory = new MemoryStorage();
    memory.setItem(GAME_STORAGE_KEY, "not-json");
    expect(new GameStorage(memory).load()).toBeNull();
    expect(memory.getItem(GAME_STORAGE_KEY)).toBeNull();
  });
});
