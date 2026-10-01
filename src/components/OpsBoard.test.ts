import { describe, expect, it } from "vitest";
import { calculateGroupStandings } from "./OpsBoard";
import type { MatchResult, Participant } from "@/types/domain";

const participants: Participant[] = ["A", "B", "C", "D"].map((playerId, index) => ({ id: playerId, playerId, name: playerId, division: null, schedulePosition: index + 1 }));
const matches = [
  { id: "ab", playerAId: "A", playerBId: "B", roundNo: 1, roundMatchNo: 1, groupNo: 1 },
  { id: "cd", playerAId: "C", playerBId: "D", roundNo: 1, roundMatchNo: 1, groupNo: 2 },
];
const results: MatchResult[] = [
  { matchId: "ab", playerASets: 2, playerBSets: 0 },
  { matchId: "cd", playerASets: 0, playerBSets: 2 },
];

describe("calculateGroupStandings", () => {
  it("조별 경기만 반영해 순위를 따로 계산한다", () => {
    const grouped = calculateGroupStandings(participants, matches, results);
    expect(grouped.get(1)?.map(row => row.playerId)).toEqual(["A", "B"]);
    expect(grouped.get(2)?.map(row => row.playerId)).toEqual(["D", "C"]);
  });
});
