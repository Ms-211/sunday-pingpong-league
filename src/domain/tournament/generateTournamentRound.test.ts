import { describe, expect, it } from "vitest";
import { generateTournamentFirstRound, getTournamentSummary } from "./generateTournamentRound";

const participants = (count: number) => Array.from({ length: count }, (_, index) => ({
  id: `lp${index}`,
  playerId: `p${index}`,
  name: `${index}`,
  division: null,
  schedulePosition: index + 1,
}));

describe("single elimination", () => {
  it("8명은 4경기로 시작하고 BYE가 없다", () => {
    const result = generateTournamentFirstRound(participants(8), "BO5");
    expect(result.matches).toHaveLength(4);
    expect(result.byes).toHaveLength(0);
    expect(result.matches.every((match) => match.matchRule === "BO5")).toBe(true);
  });

  it("6명은 상위 시드 2명이 BYE를 받는다", () => {
    const result = generateTournamentFirstRound(participants(6), "BO3");
    expect(result.matches).toHaveLength(2);
    expect(result.byes).toEqual(["p0", "p1"]);
  });

  it("예상 경기 수는 항상 참가자 수 - 1이다", () => {
    expect(getTournamentSummary(13)).toEqual({ rounds: 4, matches: 12 });
  });
});
