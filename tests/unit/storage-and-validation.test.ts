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
    expect(migrated?.version).toBe(3);
    expect(migrated?.phase).toBe("elimination");
    expect(migrated?.players[0]?.eliminated).toBe(true);
    expect(migrated?.lastElimination?.playerId).toBe("a");
    expect(migrated?.moderator.enabled).toBe(false);
    expect(migrated?.selection.method).toBe("consensus");
  });

  it("migrates a v2 discussion without expiring its timer", () => {
    const migrated = migrateStoredState({
      version: 2,
      gameId: "v2-game",
      phase: "discussion",
      config: { imposterCount: 1, imposterWordMode: "similar", multiRound: true, revealRoleOnElimination: true, timerEnabled: true, timerMinutes: 3 },
      players: [
        { id: "a", name: "An", avatar: "◆", accent: "#fff", eliminated: false, secret: { role: "civilian", word: "Phở" } },
        { id: "b", name: "Bình", avatar: "●", accent: "#000", eliminated: false, secret: { role: "imposter", word: "Bún bò" } },
        { id: "c", name: "Chi", avatar: "▲", accent: "#aaa", eliminated: false, secret: { role: "civilian", word: "Phở" } },
      ],
      round: 1,
      vote: { votes: {}, pendingTargetId: null },
    }, 123);
    expect(migrated?.discussion.stage).toBe("open-floor");
    expect(migrated?.discussion.timer.status).toBe("paused");
    expect(migrated?.discussion.timer.pausedRemainingSeconds).toBe(180);
    expect(migrated?.endedEarly).toBe(false);
  });

  it("normalizes a v3 snapshot that predates endedEarly", () => {
    const legacyV3 = migrateStoredState({
      version: 2,
      gameId: "v2-game",
      phase: "discussion",
      config: { imposterCount: 1, imposterWordMode: "similar", multiRound: true, revealRoleOnElimination: true, timerEnabled: false, timerMinutes: 3 },
      players: [
        { id: "a", name: "An", avatar: "◆", accent: "#fff", eliminated: false, secret: { role: "civilian", word: "Phở" } },
        { id: "b", name: "Bình", avatar: "●", accent: "#000", eliminated: false, secret: { role: "imposter", word: "Bún bò" } },
        { id: "c", name: "Chi", avatar: "▲", accent: "#aaa", eliminated: false, secret: { role: "civilian", word: "Phở" } },
      ],
      round: 1,
      vote: { votes: {}, pendingTargetId: null },
    }, 123)!;
    delete (legacyV3 as Partial<typeof legacyV3>).endedEarly;
    expect(migrateStoredState(legacyV3)?.endedEarly).toBe(false);
  });

  it("discards corrupted JSON instead of crashing", () => {
    const memory = new MemoryStorage();
    memory.setItem(GAME_STORAGE_KEY, "not-json");
    expect(new GameStorage(memory).load()).toBeNull();
    expect(memory.getItem(GAME_STORAGE_KEY)).toBeNull();
  });
});
