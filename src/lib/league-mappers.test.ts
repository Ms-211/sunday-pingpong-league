import { describe, expect, it } from "vitest";
import { toMatch, toMatchResults, toParticipant, toParticipantSnapshotRows } from "./league-mappers";
import { calculateStandings } from "../domain/standings/calculateStandings";

describe("league mappers", () => {
  it("preserves an explicit forfeit winner without adding sets to standings", () => {
    const match = { id:"m",player_a_id:"a",player_b_id:"b",round_no:1,round_match_no:1,match_results:{player_a_sets:0,player_b_sets:0,result_type:"FORFEIT" as const,winner_id:"b"} };
    const participants = ["a","b"].map((id,i)=>({id,playerId:id,name:id,division:null,schedulePosition:i+1}));
    const standings = calculateStandings(participants,[toMatch(match)],toMatchResults([match]));
    expect(standings[0]).toMatchObject({playerId:"b",wins:1,setsWon:0,setsLost:0});
    expect(standings[1]).toMatchObject({playerId:"a",losses:1,setsWon:0,setsLost:0});
  });
  it("maps database records and skips a missing result", () => {
    expect(toParticipant({
      id: "lp1",
      player_id: "p1",
      name_snapshot: "Kim",
      division_snapshot: null,
      schedule_position: 1
    })).toEqual({ id: "lp1", playerId: "p1", name: "Kim", division: null, schedulePosition: 1 });

    const match = {
      id: "m1",
      player_a_id: "p1",
      player_b_id: "p2",
      round_no: 1,
      round_match_no: 2
    };
    expect(toMatch(match)).toEqual({ id: "m1", playerAId: "p1", playerBId: "p2", roundNo: 1, roundMatchNo: 2 });
    expect(toMatchResults([
      { ...match, match_results: { player_a_sets: 2, player_b_sets: 1, result_type: "NORMAL" } },
      { ...match, id: "m2", match_results: null }
    ])).toEqual([{ matchId: "m1", playerASets: 2, playerBSets: 1, resultType: "NORMAL" }]);
  });

  it("creates participant snapshots in the selected order", () => {
    const players = [
      { id: "p1", name: "Kim", division: "A" },
      { id: "p2", name: "Lee", division: null }
    ];
    expect(toParticipantSnapshotRows("league", ["p2", "p1"], players)).toEqual([
      { league_id: "league", player_id: "p2", name_snapshot: "Lee", division_snapshot: null, schedule_position: 1, group_no: 1 },
      { league_id: "league", player_id: "p1", name_snapshot: "Kim", division_snapshot: "A", schedule_position: 2, group_no: 1 }
    ]);
    expect(() => toParticipantSnapshotRows("league", ["missing"], players)).toThrow("선수 정보를 찾을 수 없습니다.");
  });
});
