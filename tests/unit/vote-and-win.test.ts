import { describe, expect, it } from "vitest";
import { resolveVotes } from "../../src/core/vote-engine";
import { determineWinner } from "../../src/core/win-condition";
import type { Player } from "../../src/core/game-state";

const player = (id: string, role: "civilian" | "imposter", eliminated = false): Player => ({
  id, name: id, avatar: "◆", accent: "#fff", eliminated,
  secret: { role, word: "x", hint: null, meaning: null },
});

describe("vote resolution", () => {
  it("returns the highest tally", () => {
    expect(resolveVotes({ a: "c", b: "c", c: "b" })).toEqual({ targetId: "c", voteCount: 2, tied: false });
  });

  it("reports a tie deterministically", () => {
    expect(resolveVotes({ a: "c", b: "b" })).toEqual({ targetId: "b", voteCount: 1, tied: true });
  });
});

describe("win conditions", () => {
  it("gives citizens the win when no imposter remains", () => {
    expect(determineWinner([player("i", "imposter", true), player("c", "civilian")], true, true)).toBe("civilian");
  });

  it("gives imposters the win at parity", () => {
    expect(determineWinner([player("i", "imposter"), player("c", "civilian")], true, false)).toBe("imposter");
  });
});
