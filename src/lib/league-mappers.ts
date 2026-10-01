import type { Match, MatchResult, Participant, ResultType } from "@/types/domain";
import type { Database } from "@/types/database";

type LeagueParticipantInsert = Database["public"]["Tables"]["league_participants"]["Insert"];
type PlayerRecord = Pick<Database["public"]["Tables"]["players"]["Row"], "id" | "name" | "division">;

export type ParticipantRecord = {
  id: string;
  player_id: string;
  name_snapshot: string;
  division_snapshot: string | null;
  schedule_position: number;
  group_no?: number;
};

export type MatchRecord = {
  id: string;
  player_a_id: string;
  player_b_id: string;
  round_no: number;
  round_match_no: number;
  group_no?: number;
};

export type MatchWithResultRecord = MatchRecord & {
  match_results: {
    player_a_sets: number;
    player_b_sets: number;
    result_type: ResultType;
    winner_id?: string | null;
  } | null;
};

export function toParticipant(row: ParticipantRecord): Participant {
  return {
    id: row.id,
    playerId: row.player_id,
    name: row.name_snapshot,
    division: row.division_snapshot,
    schedulePosition: row.schedule_position,
    ...(row.group_no == null ? {} : { groupNo: row.group_no })
  };
}

export function toMatch(row: MatchRecord): Match {
  return {
    id: row.id,
    playerAId: row.player_a_id,
    playerBId: row.player_b_id,
    roundNo: row.round_no,
    roundMatchNo: row.round_match_no,
    ...(row.group_no == null ? {} : { groupNo: row.group_no })
  };
}

export function toMatchResults(matches: readonly MatchWithResultRecord[]): MatchResult[] {
  return matches.flatMap(match => match.match_results ? [{
    matchId: match.id,
    playerASets: match.match_results.result_type === "FORFEIT" && match.match_results.winner_id ? Number(match.match_results.winner_id === match.player_a_id) : match.match_results.player_a_sets,
    playerBSets: match.match_results.result_type === "FORFEIT" && match.match_results.winner_id ? Number(match.match_results.winner_id === match.player_b_id) : match.match_results.player_b_sets,
    resultType: match.match_results.result_type
  }] : []);
}

export function toParticipantSnapshotRows(leagueId: string, playerIds: string[], players: readonly PlayerRecord[] | null): LeagueParticipantInsert[] {
  return playerIds.map((playerId, index) => {
    const player = players?.find(item => item.id === playerId);
    if (!player)
      throw new Error("선수 정보를 찾을 수 없습니다.");
    return {
      league_id: leagueId,
      player_id: playerId,
      name_snapshot: player.name,
      division_snapshot: player.division,
      schedule_position: index + 1,
      group_no: 1
    };
  });
}
