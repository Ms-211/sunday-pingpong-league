import { describe, expect, it } from "vitest";
import { canCompleteLeague } from "./canCompleteLeague";

const completion = (overrides: Partial<Parameters<typeof canCompleteLeague>[0]> = {}) => canCompleteLeague({
  status: "IN_PROGRESS",
  stageMode: "SINGLE",
  finalsGenerated: false,
  totalMatches: 3,
  completedMatches: 3,
  ...overrides
});

describe("canCompleteLeague", () => {
  it("allows a regular league when every match is complete", () => {
    expect(completion()).toBe(true);
  });

  it("rejects a regular league with an incomplete match", () => {
    expect(completion({ completedMatches: 2 })).toBe(false);
  });

  it("rejects a league without matches", () => {
    expect(completion({ totalMatches: 0, completedMatches: 0 })).toBe(false);
  });

  it.each(["DRAFT", "COMPLETED"] as const)("rejects the %s status", status => {
    expect(completion({ status })).toBe(false);
  });

  it("rejects a preliminary-final league before finals are generated", () => {
    expect(completion({ stageMode: "PRELIMINARY_FINAL" })).toBe(false);
  });

  it("rejects a preliminary-final league with an incomplete final match", () => {
    expect(completion({ stageMode: "PRELIMINARY_FINAL", finalsGenerated: true, completedMatches: 2 })).toBe(false);
  });

  it("allows a preliminary-final league when every final match is complete", () => {
    expect(completion({ stageMode: "PRELIMINARY_FINAL", finalsGenerated: true })).toBe(true);
  });
});
