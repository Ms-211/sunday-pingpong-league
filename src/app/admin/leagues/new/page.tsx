import { notFound } from "next/navigation";
import { LeagueCreateManager } from "@/components/LeagueCreateManager";
import { getLeague, getLeagues, getPlayers } from "@/lib/data";
import type { LeagueFormat, MatchRule } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ leagueId?: string }>;
}) {
  const { leagueId } = await searchParams;
  const [leagues, players, draft] = await Promise.all([
    getLeagues(),
    getPlayers(),
    leagueId ? getLeague(leagueId) : Promise.resolve(null),
  ]);

  if (leagueId && (!draft || draft.status !== "DRAFT")) notFound();

  const previousLeague = leagues.find((league) => league.id !== leagueId);
  const initialDraft = draft
    ? {
        id: draft.id,
        round: draft.round_number,
        date: draft.league_date,
        format: (draft.format ?? "ROUND_ROBIN") as LeagueFormat,
        defaultRule: (draft.default_match_rule ?? "BO3") as MatchRule,
        stageMode: (draft.stage_mode ?? "SINGLE") as
          | "SINGLE"
          | "PRELIMINARY_FINAL",
        playerIds: [...draft.league_participants]
          .sort(
            (a: { schedule_position: number }, b: { schedule_position: number }) =>
              a.schedule_position - b.schedule_position,
          )
          .map((player: { player_id: string }) => player.player_id),
      }
    : null;

  return (
    <LeagueCreateManager
      nextRound={draft?.round_number ?? (leagues[0]?.round_number ?? 0) + 1}
      previous={
        previousLeague
          ? {
              round: previousLeague.round_number,
              date: previousLeague.league_date,
            }
          : null
      }
      players={players.filter((player: { is_active: boolean }) => player.is_active)}
      draft={initialDraft}
    />
  );
}
