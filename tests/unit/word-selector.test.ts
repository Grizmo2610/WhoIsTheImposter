import { describe, expect, it } from "vitest";
import type { WordGroup } from "../../src/data/word-database";
import { filterGroupsByTopics, selectGameWords, WordSelectionError } from "../../src/data/word-selector";
import { WORD_TOPICS } from "../../src/data/word-topics";

const groups: WordGroup[] = [
  { id: 1, topics: ["Ẩm thực & Đồ uống", "Việt Nam"], hint: "Món nước", related: ["Phở", "Bún bò", "Bún riêu", "Bánh canh"] },
  { id: 2, topics: ["Ẩm thực & Đồ uống"], hint: "Đồ uống", related: ["Trà sữa", "Cà phê", "Nước mía"] },
  { id: 3, topics: ["Nghệ thuật"], hint: "Biểu diễn", related: ["Kịch", "Múa", "Opera"] },
  { id: 4, topics: ["Việt Nam"], hint: "Địa danh", related: ["Hà Nội"] },
];

function sequence(...values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe("topic filtering", () => {
  it("filters one topic with OR semantics for two-topic entries", () => {
    expect(filterGroupsByTopics(groups, ["Việt Nam"]).map((group) => group.id)).toEqual([1, 4]);
  });

  it("combines multiple topics using OR", () => {
    expect(filterGroupsByTopics(groups, ["Việt Nam", "Nghệ thuật"]).map((group) => group.id)).toEqual([1, 3, 4]);
  });

  it("returns every group for All", () => {
    expect(filterGroupsByTopics(groups, WORD_TOPICS)).toHaveLength(groups.length);
  });

  it("returns no groups when no topic is selected", () => {
    expect(filterGroupsByTopics(groups, [])).toEqual([]);
  });
});

describe("similar mode", () => {
  it("assigns two unique words for one imposter", () => {
    const result = selectGameWords({ database: groups, selectedTopics: ["Ẩm thực & Đồ uống"], mode: "similar", imposterCount: 1, random: sequence(0, 0, 0, 0) });
    expect(new Set([result.civilianWord, ...result.imposterContents])).toHaveLength(2);
  });

  it("assigns three unique words for two imposters", () => {
    const result = selectGameWords({ database: groups, selectedTopics: ["Ẩm thực & Đồ uống"], mode: "similar", imposterCount: 2, random: sequence(0, 0, 0, 0, 0) });
    expect(result.imposterContents).toHaveLength(2);
    expect(new Set([result.civilianWord, ...result.imposterContents])).toHaveLength(3);
  });

  it("removes undersized groups before random selection", () => {
    const result = selectGameWords({ database: groups, selectedTopics: ["Việt Nam"], mode: "similar", imposterCount: 2, random: sequence(0.99, 0, 0, 0, 0) });
    expect(result.sourceGroupIds).toEqual([1]);
  });

  it("does not fix the civilian word to the first related item", () => {
    const result = selectGameWords({ database: [groups[0]!], selectedTopics: ["Việt Nam"], mode: "similar", imposterCount: 1, random: sequence(0, 0, 0, 0.99) });
    expect(result.civilianWord).toBe("Bún bò");
  });
});

describe("no-word mode", () => {
  it("gives civilians a related word and every imposter the group hint", () => {
    const result = selectGameWords({ database: [groups[0]!], selectedTopics: ["Việt Nam"], mode: "no-word", imposterCount: 2, random: sequence(0, 0.5) });
    expect(groups[0]!.related).toContain(result.civilianWord);
    expect(result.imposterContents).toEqual([groups[0]!.hint, groups[0]!.hint]);
    expect(result.hint).toBe(groups[0]!.hint);
  });
});

describe("different-group mode", () => {
  it("uses different group ids with a common selected topic", () => {
    const result = selectGameWords({ database: groups, selectedTopics: ["Ẩm thực & Đồ uống"], mode: "different-group", imposterCount: 1, random: sequence(0, 0, 0) });
    expect(result.sourceGroupIds).toEqual([1, 2]);
  });

  it("does not pair groups that only match different selected topics", () => {
    expect(() => selectGameWords({
      database: [groups[2]!, groups[3]!],
      selectedTopics: ["Việt Nam", "Nghệ thuật"],
      mode: "different-group",
      imposterCount: 1,
      random: () => 0,
    })).toThrowError(WordSelectionError);
  });

  it("gives multiple imposters unique words from the same group B", () => {
    const result = selectGameWords({ database: groups, selectedTopics: ["Ẩm thực & Đồ uống"], mode: "different-group", imposterCount: 2, random: sequence(0, 0, 0, 0) });
    expect(result.sourceGroupIds).toEqual([1, 2]);
    expect(new Set(result.imposterContents)).toHaveLength(2);
    expect(result.imposterContents.every((word) => groups[1]!.related.includes(word))).toBe(true);
  });

  it("returns a validation error when no valid pair exists", () => {
    expect(() => selectGameWords({ database: [groups[3]!], selectedTopics: ["Việt Nam"], mode: "different-group", imposterCount: 2 })).toThrowError(WordSelectionError);
  });
});
