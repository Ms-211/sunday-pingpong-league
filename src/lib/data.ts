import { createClient } from "@/lib/supabase/server";

const leagueHistorySelect = "id,round_number,league_date,status,completion_type,league_participants(id,player_id,name_snapshot,division_snapshot,schedule_position,group_no),matches(id,player_a_id,player_b_id,round_no,round_match_no,group_no,match_results(match_id,player_a_sets,player_b_sets,result_type,winner_id))";

export async function getLeague(id?: string) {
  const db = await createClient();
  if (!db) return null;
  let query = db.from("leagues").select("*,league_participants(*),matches(*,match_results(id,match_id,player_a_sets,player_b_sets,result_type,winner_id,created_at,updated_at))");
  query = id
    ? query.eq("id", id)
    : query.in("status", ["IN_PROGRESS", "COMPLETED"]).order("league_date", { ascending: false }).limit(1);
  const { data } = await query.maybeSingle();
  return data;
}

export async function getPlayers() {
  const db = await createClient();
  if (!db) return [];
  const { data } = await db.from("players").select("*").order("name");
  return data ?? [];
}

export async function getLeagues() {
  const db = await createClient();
  if (!db) return [];
  const { data } = await db.from("leagues").select("*,league_participants(count),matches(count)").order("round_number", { ascending: false });
  return data ?? [];
}

export async function getPublicHomeLeagues() {
  const db = await createClient();
  if (!db) return [];
  const { data } = await db.from("leagues").select("*,league_participants(count),matches(id,match_results(id))").in("status", ["IN_PROGRESS", "COMPLETED"]).order("league_date", { ascending: false });
  return data ?? [];
}

export async function getAdminDashboard() {
  const db = await createClient();
  if (!db) return { leagues: [] };
  const { data: leagues } = await db.from("leagues").select("*,league_participants(count),matches(id,match_results(id))").order("round_number", { ascending: false });
  return { leagues: leagues ?? [] };
}

export async function getLeagueListData() {
  const db = await createClient();
  if (!db) return [];
  const { data } = await db.from("leagues").select(leagueHistorySelect).order("league_date", { ascending: false });
  return data ?? [];
}
