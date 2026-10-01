import { CompletedLeaguesManager } from "@/components/CompletedLeaguesManager";
import { calculateGroupedStandings } from "@/domain/standings/calculateStandings";
import { getLeagueListData } from "@/lib/data";
import { toMatch, toMatchResults, toParticipant } from "@/lib/league-mappers";

export const dynamic = "force-dynamic";

export default async function Page(){
  const rows=await getLeagueListData();
  const leagues=rows.map(league=>{
    const participants=league.league_participants.map(toParticipant);
    const matches=league.matches.map(toMatch);
    const results=toMatchResults(league.matches);
    const winners=league.status==="COMPLETED"&&league.completion_type!=="FORCED"?calculateGroupedStandings(participants,matches,results).filter(row=>row.rank===1).map(row=>row.name):[];
    return{id:league.id,round:league.round_number,date:league.league_date,status:league.status,completionType:league.completion_type,participants:participants.length,matches:matches.length,winners};
  });
  return <CompletedLeaguesManager leagues={leagues}/>;
}
