import { describe, expect, it } from "vitest";
import { generateRoundRobin, getRoundRobinSummary } from "./generateRoundRobin";

describe("Circle Method", () => {
  for (let n = 5; n <= 20; n++) it(`${n}명 조합을 정확히 한 번 생성`, () => {
    const ps = Array.from({ length: n }, (_, i) => ({ id: `lp${i}`, playerId: `p${i}`, name: `${i}`, division: null, schedulePosition: i + 1 }));
    const matches = generateRoundRobin(ps);
    expect(matches).toHaveLength(n * (n - 1) / 2);
    expect(new Set(matches.map(m => [m.playerAId, m.playerBId].sort().join("/"))).size).toBe(matches.length);
    for (const p of ps) expect(matches.filter(m => m.playerAId === p.playerId || m.playerBId === p.playerId)).toHaveLength(n - 1);
    expect(matches.every(m => m.playerAId !== m.playerBId)).toBe(true);
    expect(Math.max(...matches.map(m => m.roundNo))).toBe(getRoundRobinSummary(n).rounds);
  });
  it("13명은 13라운드 78경기", () => expect(getRoundRobinSummary(13)).toEqual({ rounds: 13, matches: 78 }));
});
