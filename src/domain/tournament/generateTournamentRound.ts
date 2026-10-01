import type { MatchRule, Participant } from "@/types/domain";

export function getTournamentSummary(count: number) {
  return {
    rounds: count > 1 ? Math.ceil(Math.log2(count)) : 0,
    matches: Math.max(0, count - 1),
  };
}

export function generateTournamentFirstRound(participants: Participant[], matchRule: MatchRule) {
  const ordered = [...participants].sort((a, b) => a.schedulePosition - b.schedulePosition);
  if (ordered.length < 2) return { matches: [], byes: [] };
  const bracketSize = 2 ** Math.ceil(Math.log2(ordered.length));
  const byeCount = bracketSize - ordered.length;
  const byes = ordered.slice(0, byeCount).map((participant) => participant.playerId);
  const playing = ordered.slice(byeCount);
  const matches = [];
  for (let index = 0; index < playing.length; index += 2) {
    matches.push({
      playerAId: playing[index].playerId,
      playerBId: playing[index + 1].playerId,
      roundNo: 1,
      roundMatchNo: index / 2 + 1,
      matchRule,
    });
  }
  return { matches, byes };
}
