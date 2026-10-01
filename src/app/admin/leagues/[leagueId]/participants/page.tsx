import { notFound } from "next/navigation";
import { getLeague, getPlayers } from "@/lib/data";
import { ParticipantsManager } from "@/components/ParticipantsManager";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const [league, players] = await Promise.all([getLeague(leagueId), getPlayers()]);
  if (!league) notFound();
  const completed=league.matches.filter(match=>Boolean(match.match_results)).length;
  if (league.status==="COMPLETED" || (league.status==="IN_PROGRESS" && (completed>0 || league.finals_generated))) notFound();
  const participantIds=new Set(league.league_participants.map((player: { player_id: string })=>player.player_id));

  return <ParticipantsManager
    league={{
      id: league.id,
      roundNumber: league.round_number,
      format: league.format ?? "ROUND_ROBIN",
      defaultRule: league.default_match_rule ?? "BO3",
      stageMode: league.stage_mode ?? "SINGLE",
      status: league.status
    }}
    players={players.filter((player: { id: string; is_active: boolean }) => player.is_active || participantIds.has(player.id))}
    initialIds={league.league_participants
      .sort((a: { schedule_position: number }, b: { schedule_position: number }) => a.schedule_position - b.schedule_position)
      .map((player: { player_id: string }) => player.player_id)}
    initialGroupSize={league.group_size??Math.max(2,Math.ceil(league.league_participants.length/2))}
  />;
}
