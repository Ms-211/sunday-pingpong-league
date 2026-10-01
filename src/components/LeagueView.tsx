import Link from "next/link";
import { calculateStandings } from "@/domain/standings/calculateStandings";
import { formatPlayerName } from "@/lib/format";
import { toMatch, toMatchResults, toParticipant } from "@/lib/league-mappers";
import type { MatchWithResultRecord, ParticipantRecord } from "@/lib/league-mappers";
type Raw = {
  id: string;
  league_participants: Array<ParticipantRecord & {
    group_no?: number;
  }>;
  matches: Array<MatchWithResultRecord & {
    group_no?: number;
  }>;
};
export function normalize(l: Raw) {
  const participants = l.league_participants.map(p => ({ ...toParticipant(p), groupNo: p.group_no ?? 1 }));
  const matches = l.matches.map(m => ({ ...toMatch(m), groupNo: m.group_no ?? 1 }));
  const results = toMatchResults(l.matches);
  return { participants, matches, results, standings: calculateStandings(participants, matches, results) };
}
export function StandingTable({ league }: {
  league: Raw;
}) {
  const { standings } = normalize(league);
  return <div className="card standings">
    <h2>실시간 순위</h2>
    <table>
      <thead>
        <tr>
          <th>순위</th>
          <th>선수</th>
          <th>경기</th>
          <th>승-패</th>
          <th className="hide-mobile">세트득실</th>
        </tr>
      </thead>
      <tbody>{standings.map(s => <tr key={s.playerId}>
        <td>
          <b>{s.rank}</b>
        </td>
        <td>
          <Link href={`/admin/players/${s.playerId}`}>{formatPlayerName(s.name, s.division)}</Link>
        </td>
        <td>{s.matchesPlayed}</td>
        <td>
          <b>{s.wins}-{s.losses}</b>
        </td>
        <td className="hide-mobile">{s.setDifference > 0 ? "+" : ""}{s.setDifference}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
export function Schedule({ league }: {
  league: Raw;
}) {
  const participants = league.league_participants.map(toParticipant);
  const names = new Map(participants.map(p => [p.playerId, formatPlayerName(p.name, p.division)]));
  const rounds = Map.groupBy([...league.matches].sort((a, b) => a.round_no - b.round_no || a.round_match_no - b.round_match_no), m => `${m.group_no ?? 1}-${m.round_no}`);
  return <div className="rounds">{[...rounds].map(([key, ms]) => {
    const first = ms[0];
    const groupName = String.fromCharCode(64 + (first.group_no ?? 1));
    return <section className="card" key={key}>
      <h3>{groupName}그룹 · ROUND {first.round_no}</h3>
      <div className="grid">{ms.map(m => {
        const r = m.match_results;
        const content = <>
          <span>{r ? "✅" : "○"} <Link href={`/admin/players/${m.player_a_id}`}>{names.get(m.player_a_id)}</Link>{" "}
            <b>{r ? r.result_type === "FORFEIT" ? "몰수 경기" : `${r.player_a_sets}:${r.player_b_sets}` : "vs"}</b>
            {" "}<Link href={`/admin/players/${m.player_b_id}`}>{names.get(m.player_b_id)}</Link></span>
        </>;
        return <div className={`match ${r ? "done" : ""}`} key={m.id}>{content}</div>;
      })}</div>
    </section>;
  })}</div>;
}
