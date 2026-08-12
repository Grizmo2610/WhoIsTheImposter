import { describe, expect, it } from "vitest";
import { discussionDurationSeconds, formatCountdown } from "../../src/core/discussion-timer";

describe("discussion timer", () => {
  it("scales at 45 seconds per player", () => {
    expect(discussionDurationSeconds(3)).toBe(135);
    expect(discussionDurationSeconds(4)).toBe(180);
    expect(discussionDurationSeconds(8)).toBe(360);
  });

  it("formats countdown values", () => {
    expect(formatCountdown(180)).toBe("3:00");
    expect(formatCountdown(9)).toBe("0:09");
    expect(formatCountdown(-1)).toBe("0:00");
  });
});
