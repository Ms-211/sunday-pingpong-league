import type { Match, Participant } from "@/types/domain";

export type GeneratedMatch = Omit<Match, "id" | "leagueId">;

export function getRoundRobinSummary(count: number) {
  return { rounds: count % 2 === 0 ? Math.max(0, count - 1) : count, matches: count * (count - 1) / 2 };
}

export function generateRoundRobin(participants: Participant[]): GeneratedMatch[] {
  if (participants.length < 2) return [];
  const ordered = [...participants].sort((a, b) => a.schedulePosition - b.schedulePosition);
  const ids: Array<string | null> = ordered.map((p) => p.playerId);
  if (ids.length % 2) ids.push(null);
  const output: GeneratedMatch[] = [];
  for (let round = 1; round < ids.length; round++) {
    let matchNo = 1;
    for (let i = 0; i < ids.length / 2; i++) {
      const a = ids[i]; const b = ids[ids.length - 1 - i];
      if (a && b) output.push({ playerAId: a, playerBId: b, roundNo: round, roundMatchNo: matchNo++ });
    }
    ids.splice(1, 0, ids.pop()!);
  }
  return output;
}
