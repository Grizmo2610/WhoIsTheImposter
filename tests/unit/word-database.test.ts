import { describe, expect, it, vi } from "vitest";
import { loadBundledWordDatabase, validateWordDatabase } from "../../src/data/word-database";

const valid = (id: number) => ({ id, topics: ["Việt Nam"], hint: "Gợi ý", related: ["Một", "Hai"] });

describe("word database validation", () => {
  it("loads the supplied database and reports its two invalid records by id", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const groups = await loadBundledWordDatabase();
    expect(groups).toHaveLength(146);
    expect(log.mock.calls.flat().join(" ")).toContain("record 33");
    expect(log.mock.calls.flat().join(" ")).toContain("record 68");
    log.mockRestore();
  });

  it("rejects duplicate ids", () => {
    const result = validateWordDatabase([valid(1), valid(1)]);
    expect(result.groups).toHaveLength(1);
    expect(result.issues.some((issue) => issue.reason.includes("id bị trùng"))).toBe(true);
  });

  it("rejects an invalid topic", () => {
    const result = validateWordDatabase([{ ...valid(1), topics: ["Không tồn tại"] }]);
    expect(result.groups).toEqual([]);
    expect(result.issues[0]?.id).toBe(1);
  });

  it("rejects duplicate related words", () => {
    const result = validateWordDatabase([{ ...valid(1), related: ["Một", "Một"] }]);
    expect(result.groups).toEqual([]);
  });

  it("rejects empty related arrays", () => {
    const result = validateWordDatabase([{ ...valid(1), related: [] }]);
    expect(result.groups).toEqual([]);
  });

  it("rejects empty hints", () => {
    const result = validateWordDatabase([{ ...valid(1), hint: "  " }]);
    expect(result.groups).toEqual([]);
  });
});
