import type { Match, MatchResult, Participant, Standing } from "@/types/domain";
type Row = Omit<Standing, "rank">;
type Completed = Array<{match: Match; result: MatchResult}>;

export function calculateStandings(participants: Participant[], matches: Match[], results: MatchResult[]): Standing[] {
  const rows = new Map<string, Row>(participants.map(p => [p.playerId, {playerId:p.playerId,name:p.name,division:p.division,matchesPlayed:0,wins:0,losses:0,setsWon:0,setsLost:0,setDifference:0}]));
  const byMatch = new Map(results.map(r => [r.matchId, r])); const completed: Completed=[];
  for(const match of matches){const result=byMatch.get(match.id);if(!result)continue;completed.push({match,result});const a=rows.get(match.playerAId),b=rows.get(match.playerBId);if(!a||!b)continue;a.matchesPlayed++;b.matchesPlayed++;if(result.resultType!=="FORFEIT"){a.setsWon+=result.playerASets;a.setsLost+=result.playerBSets;b.setsWon+=result.playerBSets;b.setsLost+=result.playerASets;}if(result.playerASets>result.playerBSets){a.wins++;b.losses++;}else{b.wins++;a.losses++;}}
  for(const row of rows.values())row.setDifference=row.setsWon-row.setsLost;
  const winGroups=Map.groupBy([...rows.values()],r=>r.wins);const blocks:Row[][]=[];
  for(const wins of [...winGroups.keys()].sort((a,b)=>b-a))blocks.push(...resolveTieGroup(winGroups.get(wins)!,completed));
  const output:Standing[]=[];let position=1;for(const block of blocks){for(const row of block)output.push({...row,rank:position});position+=block.length;}return output;
}

export function calculateGroupedStandings(participants: Participant[], matches: Match[], results: MatchResult[]): Standing[] {
  const groups=[...new Set(participants.map(player=>player.groupNo??1))];
  return groups.flatMap(groupNo=>calculateStandings(
    participants.filter(player=>(player.groupNo??1)===groupNo),
    matches.filter(match=>(match.groupNo??1)===groupNo),
    results
  ));
}

function miniStats(group:Row[],completed:Completed){const ids=new Set(group.map(r=>r.playerId));const stats=new Map(group.map(r=>[r.playerId,{wins:0,diff:0,games:0}]));for(const{match:m,result:r}of completed)if(ids.has(m.playerAId)&&ids.has(m.playerBId)){const a=stats.get(m.playerAId)!,b=stats.get(m.playerBId)!;a.games++;b.games++;if(r.resultType!=="FORFEIT"){a.diff+=r.playerASets-r.playerBSets;b.diff+=r.playerBSets-r.playerASets;}if(r.playerASets>r.playerBSets)a.wins++;else b.wins++;}return stats;}
function totalDifferenceBlocks(group:Row[]){const groups=Map.groupBy(group,r=>r.setDifference);return [...groups.keys()].sort((a,b)=>b-a).map(k=>groups.get(k)!.sort((a,b)=>a.playerId.localeCompare(b.playerId)));}

/** Ordered blocks; members of one block have a genuine joint rank. */
export function resolveTieGroup(group:Row[],completed:Completed):Row[][]{
  if(group.length<2)return[group];const mini=miniStats(group,completed);
  if(group.length===2){const a=group[0],b=group[1],sa=mini.get(a.playerId)!,sb=mini.get(b.playerId)!;if(sa.games&&sa.wins!==sb.wins)return sa.wins>sb.wins?[[a],[b]]:[[b],[a]];return totalDifferenceBlocks(group);}
  const wins=Map.groupBy(group,r=>mini.get(r.playerId)!.wins);const winKeys=[...wins.keys()].sort((a,b)=>b-a);
  if(winKeys.length>1){const out:Row[][]=[];for(const key of winKeys)out.push(...resolveTieGroup(wins.get(key)!,completed));return out;}
  const diffs=Map.groupBy(group,r=>mini.get(r.playerId)!.diff);const out:Row[][]=[];for(const key of [...diffs.keys()].sort((a,b)=>b-a))out.push(...totalDifferenceBlocks(diffs.get(key)!));return out;
}
