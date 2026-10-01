import type { Database } from "@/types/database";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Season = Row<"seasons">;
export type Award = Row<"season_awards">;
export type StatsLeague = Pick<Row<"leagues">, "id" | "season_id" | "league_date" | "round_number" | "status" | "bracket_generated"> & {
  league_participants: Pick<Row<"league_participants">, "player_id" | "name_snapshot" | "division_snapshot">[];
  matches: (Pick<Row<"matches">, "id" | "player_a_id" | "player_b_id" | "match_rule" | "round_no" | "round_match_no" | "stage"> & { match_results: Pick<Row<"match_results">, "player_a_sets" | "player_b_sets" | "result_type"> & { winner_id?: string | null } | null })[];
  league_standings: Pick<Row<"league_standings">, "player_id" | "rank">[];
};
export const awardLabels = { CHAMPION: "🏆 챔피언", ATTENDANCE_KING: "📅 개근왕", WIN_KING: "🔥 다승왕" };
export const statusLabels = { UPCOMING: "예정", ACTIVE: "진행 중", PENDING_FINALIZATION: "확정 대기", FINALIZED: "확정" };
export function koreaDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
export function seasonStatus(season: Pick<Season, "start_date" | "end_date" | "finalized_at">, today = koreaDate()) {
  return season.finalized_at ? "FINALIZED" : today < season.start_date ? "UPCOMING" : today > season.end_date ? "PENDING_FINALIZATION" : "ACTIVE";
}
export function quarterDates(date: string) {
  const year = Number(date.slice(0, 4)), quarter = Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1;
  return { name: `${year} ${quarter}분기`, start_date: `${year}-${String(quarter * 3 - 2).padStart(2, "0")}-01`, end_date: new Date(Date.UTC(year, quarter * 3, 0)).toISOString().slice(0, 10) };
}
export type PlayerStats = {
  id: string; name: string; division: string | null; appearances: number; games: number; wins: number; losses: number;
  setsWon: number; setsLost: number; championships: number; runnersUp: number; undefeated: number; fullSets: number; cleanWins: number; streak: number;
  history: { leagueId: string; date: string; round: number; rank?: number; wins: number; losses: number }[];
};
export type Pair = { a: string; b: string; games: number; aWins: number; bWins: number; revengeA: number; revengeB: number; lastWinner?: string };
export function leaders<T>(rows: T[], value: (row: T) => number) {
  const max = Math.max(0, ...rows.map(value));
  return max > 0 ? rows.filter(row => value(row) === max) : [];
}
export function balancedPairs(pairs: Pair[], minimum: number) {
  const eligible = pairs.filter(p => p.games >= minimum);
  const difference = Math.min(...eligible.map(p => Math.abs(p.aWins - p.bWins)));
  return leaders(eligible.filter(p => Math.abs(p.aWins - p.bWins) === difference), p => p.games);
}
const order = (a: StatsLeague, b: StatsLeague) => a.league_date.localeCompare(b.league_date) || a.round_number - b.round_number || a.id.localeCompare(b.id);
export function getSeasonStats(all: StatsLeague[], seasonId?: string) {
  const leagues = all.filter(l => l.status === "COMPLETED" && (!seasonId || l.season_id === seasonId)).sort(order);
  const players = new Map<string, PlayerStats>(), pairs = new Map<string, Pair>(), streaks = new Map<string, number>();
  let games = 0;
  for (const league of leagues) {
    const participants = league.bracket_generated ? league.league_participants : [];
    for (const p of participants) {
      const row = players.get(p.player_id) ?? { id: p.player_id, name: p.name_snapshot, division: p.division_snapshot, appearances: 0, games: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0, championships: 0, runnersUp: 0, undefeated: 0, fullSets: 0, cleanWins: 0, streak: 0, history: [] };
      row.name = p.name_snapshot; row.division = p.division_snapshot; row.appearances++;
      row.history.unshift({ leagueId: league.id, date: league.league_date, round: league.round_number, rank: league.league_standings.find(s => s.player_id === p.player_id)?.rank, wins: 0, losses: 0 });
      players.set(p.player_id, row);
    }
    const matches = [...league.matches].sort((a, b) => (a.stage === b.stage ? 0 : a.stage === "PRELIMINARY" ? -1 : 1) || a.round_no - b.round_no || a.round_match_no - b.round_match_no || a.id.localeCompare(b.id));
    for (const match of matches) {
      const r = match.match_results;
      if (!r || (!r.winner_id && r.player_a_sets === r.player_b_sets)) continue;
      const a = players.get(match.player_a_id), b = players.get(match.player_b_id);
      if (!a || !b) continue;
      const winner = r.winner_id ? (r.winner_id === a.id ? a : b) : r.player_a_sets > r.player_b_sets ? a : b, loser = winner === a ? b : a;
      games++; a.games++; b.games++; winner.wins++; loser.losses++;
      winner.history[0].wins++; loser.history[0].losses++;
      if (r.result_type === "NORMAL") {
        a.setsWon += r.player_a_sets; a.setsLost += r.player_b_sets;
        b.setsWon += r.player_b_sets; b.setsLost += r.player_a_sets;
        const target = match.match_rule === "BO5" ? 3 : 2;
        if (Math.max(r.player_a_sets, r.player_b_sets) === target && Math.min(r.player_a_sets, r.player_b_sets) === target - 1) { a.fullSets++; b.fullSets++; }
        if (Math.min(r.player_a_sets, r.player_b_sets) === 0) winner.cleanWins++;
      }
      const ids = [a.id, b.id].sort(), key = JSON.stringify(ids);
      const pair = pairs.get(key) ?? { a: ids[0], b: ids[1], games: 0, aWins: 0, bWins: 0, revengeA: 0, revengeB: 0 };
      pair.games++;
      if (winner.id === pair.a) { pair.aWins++; if (pair.lastWinner === pair.b) pair.revengeA++; }
      else { pair.bWins++; if (pair.lastWinner === pair.a) pair.revengeB++; }
      pair.lastWinner = winner.id; pairs.set(key, pair);
    }
    for (const player of players.values()) {
      const history = player.history[0];
      const won = history?.leagueId === league.id && history.rank === 1;
      const streak = won ? (streaks.get(player.id) ?? 0) + 1 : 0;
      streaks.set(player.id, streak); player.streak = Math.max(player.streak, streak);
      if (won) { player.championships++; if (history.losses === 0) player.undefeated++; }
      if (history?.leagueId === league.id && history.rank === 2) player.runnersUp++;
    }
  }
  const rows = [...players.values()], pairRows = [...pairs.values()];
  const awards = ([['CHAMPION', 'championships'], ['ATTENDANCE_KING', 'appearances'], ['WIN_KING', 'wins']] as const).flatMap(([award_type, field]) => leaders(rows, p => p[field]).map(p => ({ award_type, player_id: p.id, value: p[field] })));
  const firstParticipation = new Map<string, StatsLeague>(), firstWin = new Map<string, StatsLeague>();
  for (const league of [...all].filter(l => l.status === "COMPLETED" && l.bracket_generated).sort(order)) {
    for (const p of league.league_participants) if (!firstParticipation.has(p.player_id)) firstParticipation.set(p.player_id, league);
    if (league.status === "COMPLETED") for (const s of league.league_standings) if (s.rank === 1 && !firstWin.has(s.player_id)) firstWin.set(s.player_id, league);
  }
  return { leagues, players: rows, pairs: pairRows, games, awards,
    newcomers: [...firstParticipation].filter(([, l]) => !seasonId || l.season_id === seasonId).map(([id, league]) => ({ id, league })),
    firstWins: [...firstWin].filter(([, l]) => !seasonId || l.season_id === seasonId).map(([id, league]) => ({ id, league })),
    highlights: { undefeated: leaders(rows, p => p.undefeated), runnersUp: leaders(rows, p => p.runnersUp), fullSets: leaders(rows, p => p.fullSets), cleanWins: leaders(rows, p => p.cleanWins), streak: leaders(rows, p => p.streak), frequent: leaders(pairRows, p => p.games), balanced: balancedPairs(pairRows, 2) }
  };
}
export function getPlayerRelationships(pairs: Pair[], playerId: string) {
  const opponents = pairs.filter(p => p.a === playerId || p.b === playerId).map(p => ({ id: p.a === playerId ? p.b : p.a, games: p.games, wins: p.a === playerId ? p.aWins : p.bWins, losses: p.a === playerId ? p.bWins : p.aWins, revenge: p.a === playerId ? p.revengeA : p.revengeB }));
  return { opponents, nemesis: leaders(leaders(opponents, p => p.losses), p => p.games), favorite: leaders(leaders(opponents, p => p.wins), p => p.games), frequent: leaders(opponents, p => p.games), revenge: opponents.reduce((n, p) => n + p.revenge, 0), rivals: balancedPairs(pairs.filter(p => p.a === playerId || p.b === playerId), 10) };
}
export function reviewSeason(leagues: StatsLeague[], seasonId: string) {
  const selected = leagues.filter(l => l.season_id === seasonId);
  const incomplete = selected.filter(l => l.status !== "COMPLETED");
  const missing = selected.reduce((n, l) => n + l.matches.filter(m => !m.match_results).length, 0);
  const missingStandings = selected.filter(l => l.status === "COMPLETED" && (!l.bracket_generated || !l.league_participants.length || l.league_participants.some(p => !l.league_standings.some(s => s.player_id === p.player_id))));
  return { selected, incomplete, missing, missingStandings, canFinalize: incomplete.length === 0 && missing === 0 && missingStandings.length === 0, totalMatches: selected.reduce((n, l) => n + l.matches.length, 0) };
}
