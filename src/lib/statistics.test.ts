import { describe, expect, it } from "vitest";
import { balancedPairs, getPlayerRelationships, getSeasonStats, quarterDates, reviewSeason, seasonStatus, type StatsLeague } from "./statistics";

function league(round: number, winner = "a", season = "s", ids = ["a","b"]): StatsLeague {
  return { id: `l${round}`, round_number: round, league_date: `2026-09-${String(round).padStart(2,"0")}`, status: "COMPLETED", season_id: season, bracket_generated: true,
    league_participants: ids.map(id => ({ player_id:id,name_snapshot:"동명이인",division_snapshot:null })),
    league_standings: ids.map(id => ({ player_id:id,rank:id === winner ? 1 : 2 })),
    matches: [{ id:`m${round}`,player_a_id:ids[0],player_b_id:ids[1],round_no:1,round_match_no:1,stage:"PRELIMINARY",match_rule:"BO3",match_results:{ player_a_sets: winner === ids[0] ? 2 : 1,player_b_sets:winner === ids[0] ? 1 : 2,result_type:"NORMAL" } }]
  };
}
describe("season statistics", () => {
  it("keeps all tied official winners and identifies players by id", () => {
    const s = getSeasonStats([league(1),league(2,"b")],"s");
    expect(s.awards).toHaveLength(6);
    expect(s.players).toHaveLength(2);
    expect(s.awards.filter(a => a.award_type === "ATTENDANCE_KING").map(a => a.value)).toEqual([2,2]);
  });
  it("counts forfeits as official wins and meetings, never as set records; excludes unplayed", () => {
    const l = league(1);
    l.matches[0].match_results = { player_a_sets:0,player_b_sets:0,result_type:"FORFEIT",winner_id:"a" };
    const pending = league(2); pending.matches[0].match_results = null;
    const s = getSeasonStats([l,pending]);
    expect(s.games).toBe(1); expect(s.pairs[0].games).toBe(1);
    expect(s.players[0]).toMatchObject({ wins:1,fullSets:0,cleanWins:0 });
    l.matches[0].match_results = { player_a_sets:3,player_b_sets:0,result_type:"FORFEIT" };
    expect(getSeasonStats([l]).players[0].cleanWins).toBe(0);
  });
  it("uses match-specific BO3/BO5 rules and counts normal clean wins", () => {
    const l = league(1); l.matches[0].match_rule="BO5";
    expect(getSeasonStats([l]).players[0].fullSets).toBe(0);
    l.matches[0].match_results!.player_a_sets=3; l.matches[0].match_results!.player_b_sets=2;
    expect(getSeasonStats([l]).players[0].fullSets).toBe(1);
    l.matches[0].match_results!.player_b_sets=0;
    expect(getSeasonStats([l]).players[0].cleanWins).toBe(1);
  });
  it("lists newcomers only after their first league is completed", () => {
    const past=league(1,"a","past"), current=league(2,"b"), debut=league(3,"c","s",["c","d"]);
    debut.status="IN_PROGRESS";
    const s=getSeasonStats([past,current,debut],"s");
    expect(s.newcomers).toEqual([]);
    expect(s.firstWins.map(p=>p.id)).toEqual(["b"]);
    expect(s.games).toBe(1);
    debut.status="COMPLETED";
    expect(getSeasonStats([past,current,debut],"s").newcomers.map(p=>p.id)).toEqual(["c","d"]);
  });
  it("counts only loss-to-win revenge transitions in chronological order", () => {
    const leagues=["b","b","a","a","b","a"].map((winner,i)=>league(i+1,winner));
    const s=getSeasonStats(leagues.reverse()), r=getPlayerRelationships(s.pairs,"a");
    expect(r.revenge).toBe(2); expect(r.nemesis[0]).toMatchObject({id:"b",losses:3,games:6});
    expect(r.favorite[0].wins).toBe(3);
  });
  it("merges A-B and B-A, orders preliminary before final", () => {
    const l=league(1,"b");
    l.matches.push({...l.matches[0],id:"final",stage:"FINAL",player_a_id:"b",player_b_id:"a",match_results:{player_a_sets:0,player_b_sets:2,result_type:"NORMAL"}});
    l.matches.reverse();
    const s=getSeasonStats([l]);
    expect(s.pairs).toHaveLength(1); expect(getPlayerRelationships(s.pairs,"a").revenge).toBe(1);
  });
  it("breaks championship streak on absence", () => {
    const s=getSeasonStats([league(1),league(2),league(3,"c","s",["c","d"]),league(4)]);
    expect(s.players.find(p=>p.id==="a")?.streak).toBe(2);
  });
  it("ranks balanced pairs by win difference then meeting count and retains ties", () => {
    const pair=(games:number,aWins:number,bWins:number)=>({a:"a",b:"b",games,aWins,bWins,revengeA:0,revengeB:0});
    expect(balancedPairs([pair(4,2,2),pair(6,3,3),pair(6,3,3)],2)).toHaveLength(2);
    expect(balancedPairs([pair(8,4,4)],10)).toEqual([]);
    expect(balancedPairs([pair(10,5,5),pair(28,15,13)],10)[0].games).toBe(10);
  });
  it("separates seasons by membership and handles quarter boundaries", () => {
    expect(quarterDates("2026-09-27").end_date).toBe("2026-09-30");
    expect(quarterDates("2026-10-04")).toEqual({name:"2026 4분기",start_date:"2026-10-01",end_date:"2026-12-31"});
    expect(getSeasonStats([league(1),league(2,"b","other")],"s").games).toBe(1);
  });
  it("handles empty seasons without zero-value awards", () => {
    expect(getSeasonStats([],"s")).toMatchObject({awards:[],players:[],games:0});
    expect(reviewSeason([],"s").canFinalize).toBe(true);
  });
  it("blocks incomplete, missing-result and missing-standing finalization", () => {
    const l=league(1); expect(reviewSeason([l],"s").canFinalize).toBe(true);
    l.status="DRAFT"; expect(reviewSeason([l],"s").canFinalize).toBe(false);
    expect(getSeasonStats([l]).players).toEqual([]);
    l.status="COMPLETED"; l.matches[0].match_results=null; expect(reviewSeason([l],"s").missing).toBe(1);
    l.matches=[]; l.league_standings=[]; expect(reviewSeason([l],"s").missingStandings).toHaveLength(1);
  });
  it("derives calendar states without clearing a finalized season", () => {
    const s={start_date:"2026-07-01",end_date:"2026-09-30",finalized_at:null};
    expect(seasonStatus(s,"2026-06-30")).toBe("UPCOMING");
    expect(seasonStatus(s,"2026-09-30")).toBe("ACTIVE");
    expect(seasonStatus(s,"2026-10-01")).toBe("PENDING_FINALIZATION");
    expect(seasonStatus({...s,finalized_at:"2026-10-01"},"2027-01-01")).toBe("FINALIZED");
  });
});
