import { describe, expect, it } from "vitest";
import { GameDataError, WordRepository } from "../../src/data/word-repository";

const pairs = [
  { real: "Phở", related: "Bún bò", hint: "Món nước", meaning: "Món ăn" },
  { real: "Bóng đá", related: "Bóng rổ", hint: "Có bóng", meaning: "Thể thao" },
];

describe("WordRepository", () => {
  it("fails safely for an empty word bank", () => {
    const repository = new WordRepository([], {});
    expect(() => repository.select("similar")).toThrowError(GameDataError);
  });

  it("uses the related word in similar mode", () => {
    const result = new WordRepository(pairs, {}).select("similar", () => 0);
    expect(result.imposterWord).toBe("Bún bò");
    expect(result.source).toBe("pair");
  });

  it("returns no word and a hint in hidden/no-word mode", () => {
    const result = new WordRepository(pairs, {}).select("no-word", () => 0);
    expect(result.imposterWord).toBeNull();
    expect(result.imposterHint).toBe("Món nước");
  });

  it("selects a word from a different topic through auxiliary metadata", () => {
    const repository = new WordRepository(pairs, { "Phở": "Ẩm thực", "Bóng đá": "Thể thao" });
    const result = repository.select("different-topic", () => 0);
    expect(result.imposterWord).toBe("Bóng đá");
    expect(result.source).toBe("topic-map");
  });

  it("declares a deterministic fallback when topic metadata is unavailable", () => {
    const repository = new WordRepository([
      ...pairs,
      { real: "Mèo", related: "Chó", hint: "Thú cưng", meaning: "Động vật" },
    ], {});
    const result = repository.select("different-topic", () => 0);
    expect(result.imposterWord).toBe("Bóng đá");
    expect(result.source).toBe("fallback");
  });
});
