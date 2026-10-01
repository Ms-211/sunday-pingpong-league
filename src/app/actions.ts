"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateRoundRobin } from "@/domain/round-robin/generateRoundRobin";
import { generateTournamentFirstRound } from "@/domain/tournament/generateTournamentRound";
import { calculateGroupedStandings, calculateStandings } from "@/domain/standings/calculateStandings";
import { canCompleteLeague } from "@/domain/canCompleteLeague";
import { canDeleteLeague } from "@/domain/canDeleteLeague";
import { canRebuildSchedule } from "@/domain/canRebuildSchedule";
import { toMatch, toMatchResults, toParticipant, toParticipantSnapshotRows } from "@/lib/league-mappers";
import type { MatchInsert, TournamentAdvanceInsert } from "@/types/database";
import type { Participant } from "@/types/domain";
type DbClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;
const leagueFormSchema = z.object({
  round_number: z.coerce.number().int().positive(),
  league_date: z.string().date(),
  format: z.enum(["ROUND_ROBIN", "SINGLE_ELIMINATION"]),
  default_match_rule: z.enum(["BO3", "BO5"]),
  stage_mode: z.enum(["SINGLE", "PRELIMINARY_FINAL"])
});
async function admin() {
  const db = await createClient();
  if (!db)
    throw new Error("Supabase 환경변수를 설정해 주세요.");
  const { data: { user } } = await db.auth.getUser();
  if (!user)
    throw new Error("관리자 로그인이 필요합니다.");
  const { data: isAdmin, error: adminError } = await db.rpc("is_admin");
  if (adminError || !isAdmin) throw new Error("관리자 권한이 필요합니다.");
  return { db, user };
}
export async function login(form: FormData) {
  const db = await createClient();
  if (!db)
    redirect("/admin/login?error=config");
  const parsed = z.object({ email: z.string().email(), password: z.string().min(6) }).safeParse(Object.fromEntries(form));
  if (!parsed.success)
    redirect("/admin/login?error=input");
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error) {
    const message = error.message.toLowerCase();
    const reason = error.code ?? (message.includes("invalid login credentials") ? "invalid_credentials" : message.includes("email not confirmed") ? "email_not_confirmed" : error.status === 429 ? "over_request_rate_limit" : "auth");
    console.error("Supabase login failed", { reason, status: error.status, message: error.message });
    redirect(`/admin/login?error=${encodeURIComponent(reason)}`);
  }
  redirect("/admin");
}
export async function logout() {
  const db = await createClient();
  await db?.auth.signOut();
  redirect("/admin/login");
}
export async function savePlayer(form: FormData) {
  const { db } = await admin();
  const value = z.object({
    id: z.string().uuid().optional().or(z.literal("")),
    name: z.string().trim().min(1).max(50),
    affiliation: z.string().trim().max(50),
    division: z.string().trim().max(20),
    is_active: z.enum(["true", "false"]).transform(value => value === "true")
  }).parse(Object.fromEntries(form));
  const row = { name: value.name, affiliation: value.affiliation || null, division: value.division || null, is_active: value.is_active };
  const { error } = value.id ? await db.from("players").update(row).eq("id", value.id) : await db.from("players").insert(row);
  if (error)
    throw error;
  revalidatePath("/admin/players");
}
export async function createLeague(form: FormData) {
  const { db } = await admin();
  const value = leagueFormSchema.parse(Object.fromEntries(form));
  const ids = form.getAll("playerIds").map(String);
  if (ids.length < 2)
    throw new Error("참가자를 2명 이상 선택해 주세요.");
  const [{ data, error }, { data: players }] = await Promise.all([
    db.from("leagues").insert({ ...value, advance_per_group: null, best_of_sets: value.default_match_rule === "BO5" ? 5 : 3 }).select("id").single(),
    db.from("players").select("id,name,division").in("id", ids)
  ]);
  if (error || !data)
    throw error ?? new Error("리그 생성에 실패했습니다.");
  const rows = toParticipantSnapshotRows(data.id, ids, players);
  const { error: participantError } = await db.from("league_participants").insert(rows);
  if (participantError)
    throw participantError;
  redirect(`/admin/leagues/${data.id}/participants`);
}
export async function updateDraftLeague(leagueId: string, form: FormData) {
  const { db } = await admin();
  const value = leagueFormSchema.parse(Object.fromEntries(form));
  const ids = form.getAll("playerIds").map(String);
  if (ids.length < 2)
    throw new Error("참가자를 2명 이상 선택해 주세요.");
  const { data: league, error: leagueError } = await db.from("leagues").select("status").eq("id", leagueId).single();
  if (leagueError || !league)
    throw new Error(leagueError?.message ?? "리그를 찾을 수 없습니다.");
  if (league.status !== "DRAFT")
    throw new Error("생성 중인 리그만 수정할 수 있습니다.");
  const { data: players, error: playersError } = await db.from("players").select("id,name,division").in("id", ids);
  if (playersError)
    throw playersError;
  const { error: updateError } = await db.from("leagues").update({
    ...value,
    best_of_sets: value.default_match_rule === "BO5" ? 5 : 3,
    advance_per_group: null,
    bracket_generated: false,
    finals_generated: false
  }).eq("id", leagueId).eq("status", "DRAFT");
  if (updateError)
    throw updateError;
  await db.from("matches").delete().eq("league_id", leagueId);
  await db.from("tournament_advances").delete().eq("league_id", leagueId);
  const { error: participantDeleteError } = await db.from("league_participants").delete().eq("league_id", leagueId);
  if (participantDeleteError)
    throw participantDeleteError;
  const rows = toParticipantSnapshotRows(leagueId, ids, players);
  const { error: participantError } = await db.from("league_participants").insert(rows);
  if (participantError)
    throw participantError;
  revalidatePath("/admin/leagues");
  redirect(`/admin/leagues/${leagueId}/participants`);
}
function buildSchedule(leagueId: string, format: "ROUND_ROBIN" | "SINGLE_ELIMINATION", rule: "BO3" | "BO5", participants: Participant[]) {
  const groupNos = [...new Set(participants.map(p => p.groupNo ?? 1))].sort((a, b) => a - b);
  const rows: MatchInsert[] = [];
  const byes: TournamentAdvanceInsert[] = [];
  const roundCounters = new Map<number, number>();
  for (const groupNo of groupNos) {
    const group = participants.filter(p => (p.groupNo ?? 1) === groupNo);
    if (format === "ROUND_ROBIN") {
      for (const match of generateRoundRobin(group)) {
        const next = (roundCounters.get(match.roundNo) ?? 0) + 1;
        roundCounters.set(match.roundNo, next);
        rows.push({
          league_id: leagueId,
          player_a_id: match.playerAId,
          player_b_id: match.playerBId,
          round_no: match.roundNo,
          round_match_no: next,
          match_rule: rule,
          group_no: groupNo,
          stage: "PRELIMINARY"
        });
      }
    }
    else {
      const generated = generateTournamentFirstRound(group, rule);
      for (const match of generated.matches) {
        const next = (roundCounters.get(match.roundNo) ?? 0) + 1;
        roundCounters.set(match.roundNo, next);
        rows.push({
          league_id: leagueId,
          player_a_id: match.playerAId,
          player_b_id: match.playerBId,
          round_no: match.roundNo,
          round_match_no: next,
          match_rule: match.matchRule,
          group_no: groupNo,
          stage: "PRELIMINARY"
        });
      }
      byes.push(...generated.byes.map(playerId => ({ league_id: leagueId, round_no: 1, player_id: playerId, group_no: groupNo })));
    }
  }
  return { rows, byes };
}
async function insertSchedule(db: DbClient, leagueId: string, format: "ROUND_ROBIN" | "SINGLE_ELIMINATION", rule: "BO3" | "BO5", participants: Participant[]) {
  const { error: matchDeleteError } = await db.from("matches").delete().eq("league_id", leagueId);
  if (matchDeleteError)
    throw new Error(`기존 대진표를 정리하지 못했습니다: ${matchDeleteError.message}`);
  const { error: advanceDeleteError } = await db.from("tournament_advances").delete().eq("league_id", leagueId);
  if (advanceDeleteError)
    throw new Error(`기존 부전승 정보를 정리하지 못했습니다: ${advanceDeleteError.message}`);
  const { rows, byes } = buildSchedule(leagueId, format, rule, participants);
  if (rows.length) {
    const { error } = await db.from("matches").insert(rows);
    if (error)
      throw error;
  }
  if (byes.length) {
    const { error } = await db.from("tournament_advances").insert(byes);
    if (error)
      throw error;
  }
  await db.from("leagues").update({ bracket_generated: true, finals_generated: false }).eq("id", leagueId);
}
export async function createScheduleFromParticipants(leagueId: string, form: FormData) {
  const { db } = await admin();
  const ids = form.getAll("playerIds").map(String);
  if (ids.length < 2)
    throw new Error("참가자를 2명 이상 선택해 주세요.");
  const settings = z.object({
    format: z.enum(["ROUND_ROBIN", "SINGLE_ELIMINATION"]),
    default_match_rule: z.enum(["BO3", "BO5"]),
    group_size: z.coerce.number().int().min(2)
  }).parse(Object.fromEntries(form));
  const [{ data: league, error: leagueError }, { data: players, error: playersError }] = await Promise.all([
    db.from("leagues").select("status").eq("id", leagueId).single(),
    db.from("players").select("id,name,division").in("id", ids)
  ]);
  if (leagueError)
    throw new Error(`리그 정보를 불러오지 못했습니다: ${leagueError.message}`);
  if (playersError)
    throw new Error(`선수 정보를 불러오지 못했습니다: ${playersError.message}`);
  if (league?.status !== "DRAFT")
    throw new Error("시작 전 상태의 리그에서만 대진표를 생성할 수 있습니다.");
  const { error: settingsError } = await db.from("leagues").update({
    ...settings,
    best_of_sets: settings.default_match_rule === "BO5" ? 5 : 3,
    group_size: settings.group_size
  }).eq("id", leagueId);
  if (settingsError)
    throw new Error(`대진 설정을 저장하지 못했습니다: ${settingsError.message}`);
  const { error: deleteError } = await db.from("league_participants").delete().eq("league_id", leagueId);
  if (deleteError)
    throw new Error(`기존 참가자 정보를 정리하지 못했습니다: ${deleteError.message}`);
  const ordered = ids.map((id, i) => {
    const player = players?.find(p => p.id === id);
    if (!player)
      throw new Error("선수 정보를 찾을 수 없습니다.");
    return {
      playerId: id,
      name: player.name,
      division: player.division,
      schedulePosition: i + 1,
      groupNo: Math.floor(i / settings.group_size) + 1
    };
  });
  const { data: inserted, error: participantError } = await db.from("league_participants").insert(ordered.map(p => ({
    league_id: leagueId,
    player_id: p.playerId,
    name_snapshot: p.name,
    division_snapshot: p.division,
    schedule_position: p.schedulePosition,
    group_no: p.groupNo
  }))).select("id,player_id,name_snapshot,division_snapshot,schedule_position,group_no");
  if (participantError || !inserted)
    throw new Error(`참가자 저장에 실패했습니다${participantError ? `: ${participantError.message}` : "."}`);
  const participants = inserted.map(p => ({ ...toParticipant(p), groupNo: p.group_no }));
  await insertSchedule(db, leagueId, settings.format, settings.default_match_rule, participants);
  const { error: startError } = await db.from("leagues").update({ status: "IN_PROGRESS" }).eq("id", leagueId);
  if (startError)
    throw new Error(`리그를 시작하지 못했습니다: ${startError.message}`);
  revalidatePath("/", "layout");
  redirect(`/ops/${leagueId}`);
}
export async function rebuildScheduleFromParticipants(leagueId: string, form: FormData) {
  const { db } = await admin();
  const ids = form.getAll("playerIds").map(String);
  const { group_size } = z.object({ group_size: z.coerce.number().int().min(2) }).parse(Object.fromEntries(form));
  if (group_size>ids.length)
    throw new Error("그룹당 인원이 참가자 수보다 많을 수 없습니다.");
  const { data: league, error } = await db.from("leagues").select("status,format,default_match_rule,finals_generated,league_participants(*),matches(id,match_results(id))").eq("id",leagueId).single();
  if (error || !league)
    throw new Error(error?.message ?? "리그를 찾을 수 없습니다.");
  const completed=league.matches.filter(match=>Boolean(match.match_results)).length;
  if (!canRebuildSchedule(league.status,completed,league.finals_generated))
    throw new Error(completed ? "경기 결과가 입력된 리그는 대진표를 수정할 수 없습니다." : "현재 상태에서는 대진표를 수정할 수 없습니다.");
  const currentIds=league.league_participants.map(player=>player.player_id);
  if (ids.length!==currentIds.length || new Set(ids).size!==ids.length || ids.some(id=>!currentIds.includes(id)))
    throw new Error("기존 참가자 구성과 일치하지 않습니다.");
  const snapshots=new Map(league.league_participants.map(player=>[player.player_id,player]));
  const participants=ids.map((id,index)=>{
    const player=snapshots.get(id)!;
    return { id:player.id,playerId:id,name:player.name_snapshot,division:player.division_snapshot,schedulePosition:index+1,groupNo:Math.floor(index/group_size)+1 };
  });
  const { rows, byes }=buildSchedule(leagueId,league.format,league.default_match_rule,participants);
  const { error: rebuildError }=await db.rpc("rebuild_league_schedule",{
    p_league_id:leagueId,
    p_group_size:group_size,
    p_participants:participants.map(player=>({player_id:player.playerId,schedule_position:player.schedulePosition,group_no:player.groupNo})),
    p_matches:rows,
    p_byes:byes
  });
  if (rebuildError?.code === "PGRST202") {
    for (let index=0;index<participants.length;index++) {
      const { error: temporaryPositionError }=await db.from("league_participants").update({schedule_position:100001+index}).eq("league_id",leagueId).eq("player_id",participants[index].playerId);
      if (temporaryPositionError)
        throw new Error(`참가자 순서를 변경하지 못했습니다: ${temporaryPositionError.message}`);
    }
    for (const participant of participants) {
      const { error: participantError }=await db.from("league_participants").update({schedule_position:participant.schedulePosition,group_no:participant.groupNo}).eq("league_id",leagueId).eq("player_id",participant.playerId);
      if (participantError)
        throw new Error(`참가자 그룹을 변경하지 못했습니다: ${participantError.message}`);
    }
    await insertSchedule(db,leagueId,league.format,league.default_match_rule,participants);
    const { error: groupSizeError }=await db.from("leagues").update({group_size}).eq("id",leagueId);
    if (groupSizeError)
      throw new Error(`그룹 설정을 저장하지 못했습니다: ${groupSizeError.message}`);
  } else if (rebuildError) {
    throw new Error(`대진표를 다시 생성하지 못했습니다: ${rebuildError.message}`);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/leagues/${leagueId}`);
}
export async function generateFinalStage(leagueId: string) {
  const { db } = await admin();
  const { data: league, error } = await db.from("leagues").select("status,stage_mode,advance_per_group,default_match_rule,finals_generated,league_participants(*),matches(*,match_results(id,match_id,player_a_sets,player_b_sets,result_type,winner_id,created_at,updated_at))").eq("id", leagueId).single();
  if (error || !league)
    throw new Error(error?.message ?? "리그 정보를 찾을 수 없습니다.");
  if (league.status !== "IN_PROGRESS" || league.stage_mode !== "PRELIMINARY_FINAL")
    throw new Error("예선+본선 방식의 진행 중 리그에서만 본선을 생성할 수 있습니다.");
  if (league.finals_generated)
    redirect(`/ops/${leagueId}`);
  const prelim = league.matches.filter(match => (match.stage ?? "PRELIMINARY") === "PRELIMINARY");
  if (!prelim.length || prelim.some(match => !match.match_results))
    throw new Error("예선 경기가 모두 완료되어야 본선을 생성할 수 있습니다.");
  const groupNos = [
    ...new Set(league.league_participants.map(player => player.group_no ?? 1))
  ].sort((a, b) => a - b);
  if (groupNos.length < 2)
    throw new Error("예선+본선 방식은 예선 그룹이 2개 이상 필요합니다.");
  const upper: Participant[] = [];
  const lower: Participant[] = [];
  for (const groupNo of groupNos) {
    const groupPlayers = league.league_participants.filter(player => (player.group_no ?? 1) === groupNo);
    const participants: Participant[] = groupPlayers.map(player => ({ ...toParticipant(player), groupNo }));
    const ids = new Set(participants.map(player => player.playerId));
    const rawMatches = prelim.filter(match => ids.has(match.player_a_id) && ids.has(match.player_b_id));
    const matches = rawMatches.map(match => ({ ...toMatch(match), groupNo }));
    const results = toMatchResults(rawMatches);
    const standings = calculateStandings(participants, matches, results);
    const byId = new Map(participants.map(player => [player.playerId, player]));
    const cut = Math.max(1, Math.floor(participants.length / 2));
    standings.forEach((standing, index) => {
      const player = byId.get(standing.playerId);
      if (player)
        (index < cut ? upper : lower).push(player);
    });
  }
  const finalGroups = [upper, lower].filter(group => group.length >= 2);
  if (!finalGroups.length)
    throw new Error("본선 그룹을 구성할 참가자가 부족합니다.");
  const rows: MatchInsert[] = [];
  for (let index = 0; index < finalGroups.length; index++)
    for (const match of generateRoundRobin(finalGroups[index]))
      rows.push({
        league_id: leagueId,
        player_a_id: match.playerAId,
        player_b_id: match.playerBId,
        round_no: match.roundNo,
        round_match_no: match.roundMatchNo,
        match_rule: league.default_match_rule,
        group_no: index + 1,
        stage: "FINAL"
      });
  const { error: insertError } = await db.from("matches").insert(rows);
  if (insertError)
    throw insertError;
  const { error: updateError } = await db.from("leagues").update({ finals_generated: true }).eq("id", leagueId);
  if (updateError)
    throw updateError;
  revalidatePath("/", "layout");
  redirect(`/ops/${leagueId}`);
}
async function getSnapshotStandings(db: DbClient, leagueId: string) {
  const { data: l, error } = await db.from("leagues").select("league_participants(*),matches(*,match_results(id,match_id,player_a_sets,player_b_sets,result_type,winner_id,created_at,updated_at))").eq("id", leagueId).single();
  if (error)
    throw error;
  const participants = l.league_participants.map(toParticipant);
  const matches = l.matches.map(toMatch);
  const results = toMatchResults(l.matches);
  return calculateGroupedStandings(participants, matches, results);
}
async function refreshSnapshot(db: DbClient, leagueId: string) {
  const standings = await getSnapshotStandings(db, leagueId);
  const { error: deleteError } = await db.from("league_standings").delete().eq("league_id", leagueId);
  if (deleteError)
    throw deleteError;
  if (standings.length) {
    const { error: e } = await db.from("league_standings").insert(standings.map(s => ({
      league_id: leagueId,
      player_id: s.playerId,
      rank: s.rank,
      matches_played: s.matchesPlayed,
      wins: s.wins,
      losses: s.losses,
      sets_won: s.setsWon,
      sets_lost: s.setsLost,
      set_difference: s.setDifference,
      tie_break_data: { rules: "wins/head-to-head/mini-league/sets" }
    })));
    if (e)
      throw e;
  }
}
export async function setLeagueStatus(leagueId: string, status: "IN_PROGRESS" | "COMPLETED") {
  const { db } = await admin();
  const { data: league, error: leagueError } = await db.from("leagues").select("status,stage_mode,finals_generated,matches(id,match_results(id))").eq("id", leagueId).single();
  if (leagueError || !league)
    throw leagueError ?? new Error("리그를 찾을 수 없습니다.");
  const totalMatches = league.matches.length;
  const completedMatches = league.matches.filter(match => Boolean(match.match_results)).length;
  if (status === "IN_PROGRESS" && !totalMatches)
    throw new Error("대진표를 먼저 생성해 주세요.");
  if (status === "COMPLETED" && !canCompleteLeague({
    status: league.status,
    stageMode: league.stage_mode,
    finalsGenerated: league.finals_generated,
    totalMatches,
    completedMatches
  }))
    throw new Error("정상 완료 조건을 충족하지 않았습니다.");
  if (status === "COMPLETED")
    await refreshSnapshot(db, leagueId);
  const { error } = await db.from("leagues").update({
    status,
    completed_at: status === "COMPLETED" ? new Date().toISOString() : null,
    completion_type: "NORMAL"
  }).eq("id", leagueId);
  if (error)
    throw error;
  revalidatePath("/", "layout");
}
export async function completeLeagueFromOps(leagueId: string) {
  await setLeagueStatus(leagueId, "COMPLETED");
  redirect("/admin");
}
export async function forceCompleteLeague(leagueId: string) {
  const { db } = await admin();
  const standings = await getSnapshotStandings(db, leagueId);
  const payload = standings.map(s => ({
    player_id: s.playerId,
    rank: s.rank,
    matches_played: s.matchesPlayed,
    wins: s.wins,
    losses: s.losses,
    sets_won: s.setsWon,
    sets_lost: s.setsLost,
    set_difference: s.setDifference,
    tie_break_data: { rules: "wins/head-to-head/mini-league/sets", forced: true }
  }));
  const { error } = await db.rpc("force_complete_league", { p_league_id: leagueId, p_standings: payload });
  if (error)
    throw error;
  revalidatePath("/", "layout");
  revalidatePath("/admin/leagues");
}
export async function deleteDraftLeague(leagueId: string) {
  const { db } = await admin();
  const { data: league, error: leagueError } = await db.from("leagues").select("status").eq("id", leagueId).single();
  if (leagueError || !league)
    throw new Error(leagueError?.message ?? "리그를 찾을 수 없습니다.");
  if (league.status !== "DRAFT")
    throw new Error("생성 중인 리그만 삭제할 수 있습니다.");
  const { error } = await db.from("leagues").delete().eq("id", leagueId).eq("status", "DRAFT");
  if (error)
    throw error;
  revalidatePath("/", "layout");
  revalidatePath("/admin/leagues");
}
export async function deleteEditableLeague(leagueId: string, form: FormData) {
  const { db } = await admin();
  const confirmation = String(form.get("confirmation") ?? "");
  const { data: league, error: leagueError } = await db.from("leagues").select("status,round_number").eq("id", leagueId).single();
  if (leagueError || !league)
    throw new Error(leagueError?.message ?? "리그를 찾을 수 없습니다.");
  if (!canDeleteLeague(league.status, league.round_number, confirmation))
    throw new Error(league.status === "COMPLETED" ? "완료된 리그는 삭제할 수 없습니다." : "삭제 확인 문구가 일치하지 않습니다.");
  const { error } = await db.from("leagues").delete().eq("id", leagueId).in("status", ["DRAFT", "IN_PROGRESS"]);
  if (error)
    throw error;
  revalidatePath("/", "layout");
  redirect("/admin/leagues");
}
export async function changeDefaultMatchRule(leagueId: string, form: FormData) {
  const { db } = await admin();
  const { rule } = z.object({ rule: z.enum(["BO3", "BO5"]) }).parse(Object.fromEntries(form));
  const { error } = await db.from("leagues").update({ default_match_rule: rule, best_of_sets: rule === "BO5" ? 5 : 3 }).eq("id", leagueId);
  if (error)
    throw error;
  const { data: pending } = await db.from("matches").select("id,match_results(id)").eq("league_id", leagueId);
  const ids = (pending ?? []).filter(match => !match.match_results).map(match => match.id);
  if (ids.length) {
    const { error: updateError } = await db.from("matches").update({ match_rule: rule }).in("id", ids);
    if (updateError)
      throw updateError;
  }
  revalidatePath(`/admin/leagues/${leagueId}`);
  revalidatePath(`/ops/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}`);
}
async function advanceTournament(db: DbClient, leagueId: string, groupNo: number) {
  const { data: league } = await db.from("leagues").select("format,default_match_rule").eq("id", leagueId).single();
  if (league?.format !== "SINGLE_ELIMINATION")
    return;
  const { data: all } = await db.from("matches").select("id,round_no,round_match_no,player_a_id,player_b_id,match_results(player_a_sets,player_b_sets,winner_id)").eq("league_id", leagueId).eq("group_no", groupNo).order("round_no").order("round_match_no");
  if (!all?.length)
    return;
  const round = Math.max(...all.map(match => match.round_no));
  const current = all.filter(match => match.round_no === round);
  const completed = current.filter((match): match is typeof match & {
    match_results: NonNullable<typeof match.match_results>;
  } => match.match_results !== null);
  if (completed.length !== current.length || all.some(match => match.round_no > round))
    return;
  const { data: byes } = await db.from("tournament_advances").select("player_id").eq("league_id", leagueId).eq("group_no", groupNo).eq("round_no", round);
  const winners = completed.map(match => {
    const result = match.match_results;
    return result.winner_id ?? (result.player_a_sets > result.player_b_sets ? match.player_a_id : match.player_b_id);
  });
  const players = [...(byes ?? []).map(bye => bye.player_id), ...winners];
  if (players.length < 2)
    return;
  const nextRound = round + 1;
  const { data: existingNext } = await db.from("matches").select("round_match_no").eq("league_id", leagueId).eq("round_no", nextRound).order("round_match_no", { ascending: false }).limit(1);
  const offset = existingNext?.[0]?.round_match_no ?? 0;
  const rows: MatchInsert[] = [];
  for (let index = 0; index < players.length - 1; index += 2)
    rows.push({
      league_id: leagueId,
      player_a_id: players[index],
      player_b_id: players[index + 1],
      round_no: nextRound,
      round_match_no: offset + index / 2 + 1,
      match_rule: league.default_match_rule,
      group_no: groupNo
    });
  const { error } = await db.from("matches").insert(rows);
  if (error)
    throw error;
  if (players.length % 2) {
    const lastPlayer = players.at(-1);
    if (lastPlayer)
      await db.from("tournament_advances").insert({ league_id: leagueId, round_no: nextRound, player_id: lastPlayer, group_no: groupNo });
  }
}
export async function saveResult(matchId: string, leagueId: string, a: number, b: number, type: "NORMAL" | "FORFEIT" = "NORMAL", acknowledged = false) {
  const { db } = await admin();
  z.enum(["NORMAL", "FORFEIT"]).parse(type);
  const { data: match } = await db.from("matches").select("league_id,match_rule,group_no,player_a_id,player_b_id").eq("id", matchId).single();
  if (!match || match.league_id !== leagueId)
    throw new Error("경기 정보를 찾을 수 없습니다.");
  const { data: league } = await db.from("leagues").select("status,season_id").eq("id", leagueId).single();
  if (!league) throw new Error("리그를 찾을 수 없습니다.");
  const { data: season } = await db.from("seasons").select("finalized_at,revision").eq("id", league.season_id).single();
  if (!season) throw new Error("시즌 정보를 찾을 수 없습니다.");
  if (season?.finalized_at && !acknowledged) throw new Error("확정된 시즌 수정 경고를 확인해 주세요.");
  const valid = Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a <= 3 && b <= 3 && a !== b && (a > 0 || b > 0);
  if (!valid)
    throw new Error("0~3 사이에서 동점이 아닌 세트 점수를 입력해 주세요.");
  const resultRow = { player_a_sets: type === "FORFEIT" ? 0 : a, player_b_sets: type === "FORFEIT" ? 0 : b, result_type: type, winner_id: type === "FORFEIT" ? (a > b ? match.player_a_id : match.player_b_id) : null };
  let snapshot: Awaited<ReturnType<typeof getSnapshotStandings>> = [];
  if (league.status === "COMPLETED") {
    const { data: source, error } = await db.from("leagues").select("league_participants(*),matches(*,match_results(id,match_id,player_a_sets,player_b_sets,result_type,winner_id,created_at,updated_at))").eq("id",leagueId).single();
    if (error || !source) throw error ?? new Error("순위 계산 데이터를 찾을 수 없습니다.");
    const matches = source.matches.map(m => m.id === matchId ? { ...m, match_results: { ...resultRow, match_id: matchId } } : m);
    snapshot = calculateGroupedStandings(source.league_participants.map(toParticipant), matches.map(toMatch), toMatchResults(matches));
  }
  const { error } = await db.rpc("save_reviewed_result", {
    p_match_id: matchId, p_revision: season.revision, p_a: a, p_b: b, p_type: type, p_acknowledged: acknowledged,
    p_standings: snapshot.map(s => ({ player_id:s.playerId,rank:s.rank,matches_played:s.matchesPlayed,wins:s.wins,losses:s.losses,sets_won:s.setsWon,sets_lost:s.setsLost,set_difference:s.setDifference }))
  });
  if (error)
    throw error;
  if (league.status !== "COMPLETED") await advanceTournament(db, leagueId, match.group_no ?? 1);
  revalidatePath("/", "layout");
  revalidatePath(`/ops/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/admin/leagues/${leagueId}`);
}
