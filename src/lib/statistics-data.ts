import { createClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { koreaDate } from "@/lib/statistics";

async function pages<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499);
    if (error) throw new Error(`통계 조회 실패: ${error.message}`);
    rows.push(...data ?? []);
    if (!data || data.length < 500) return rows;
  }
}
export async function getStatisticsData() {
  const db = await createClient();
  if (!db) throw new Error("Supabase 환경변수를 설정해 주세요.");
  const { error } = await db.rpc("ensure_calendar_seasons", {});
  if (error) throw new Error(`시즌 조회 준비 실패: ${error.message}`);
  const [seasons, awards, leagues, participants, matches, results, standings, players] = await Promise.all([
    pages((a,b) => db.from("seasons").select("*").order("id").range(a,b)),
    pages((a,b) => db.from("season_awards").select("*").order("id").range(a,b)),
    pages((a,b) => db.from("leagues").select("*").order("id").range(a,b)),
    pages((a,b) => db.from("league_participants").select("*").order("id").range(a,b)),
    pages((a,b) => db.from("matches").select("*").order("id").range(a,b)),
    pages((a,b) => db.from("match_results").select("id,match_id,player_a_sets,player_b_sets,result_type,winner_id,created_at,updated_at").order("id").range(a,b)),
    pages((a,b) => db.from("league_standings").select("*").order("id").range(a,b)),
    pages((a,b) => db.from("players").select("*").order("id").range(a,b))
  ]);
  const resultMap = new Map(results.map(r => [r.match_id, r]));
  const participantMap = Map.groupBy(participants, p => p.league_id);
  const matchMap = Map.groupBy(matches, m => m.league_id);
  const standingMap = Map.groupBy(standings, s => s.league_id);
  const people = new Map<string,{ id:string; name:string; division:string|null; affiliation?:string|null }>(participants.map(p => [p.player_id, { id: p.player_id, name: p.name_snapshot, division: p.division_snapshot, affiliation:null }]));
  for (const p of players) people.set(p.id, p);
  return { seasons: seasons.sort((a,b) => b.start_date.localeCompare(a.start_date)), awards, people,
    leagues: leagues.map(l => ({ ...l, league_participants: participantMap.get(l.id) ?? [], matches: (matchMap.get(l.id) ?? []).map(m => ({ ...m, match_results: resultMap.get(m.id) ?? null })), league_standings: standingMap.get(l.id) ?? [] })) };
}
export function selectedSeason(seasons: Awaited<ReturnType<typeof getStatisticsData>>["seasons"], id?: string) {
  const today = koreaDate();
  return seasons.find(s => s.id === id) ?? seasons.find(s => s.start_date <= today && s.end_date >= today) ?? seasons[0];
}
