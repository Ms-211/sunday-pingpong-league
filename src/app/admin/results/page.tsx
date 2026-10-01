import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Info, Medal, Monitor, Users } from "lucide-react";
import { getLeague } from "@/lib/data";
import { leagueTitle } from "@/lib/format";
import { calculateStandings } from "@/domain/standings/calculateStandings";
import { toMatch, toMatchResults, toParticipant } from "@/lib/league-mappers";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const league = await getLeague();
  if (!league || league.status === "DRAFT")
    notFound();
  const participants = league.league_participants.map(toParticipant);
  const rawMatches = league.matches;
  const matches = rawMatches.map(toMatch);
  const results = toMatchResults(rawMatches);
  const standings = calculateStandings(participants, matches, results);
  const pageSize = 10;
  const requestedPage = Number((await searchParams).page);
  const totalPages = Math.max(1, Math.ceil(standings.length / pageSize));
  const currentPage = Number.isInteger(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const visibleStandings = standings.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const done = results.length, total = matches.length, pct = total ? Math.round(done / total * 1000) / 10 : 0;
  const date = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).format(new Date(`${league.league_date}T00:00:00`));
  return <div className="results-page admin-page">
    <header className="results-header admin-page-header">
      <div>
        <h1>실시간 순위</h1>
        <p>홈　›　리그 관리　›　{leagueTitle(league.round_number)}　›　실시간 순위</p>
      </div>
      <div>
        <Link href={`/admin/leagues/${league.id}`}>
          <ArrowLeft />
          이전 단계로</Link>
        <Link href={`/ops/${league.id}`}>
          <Monitor />
          현장 화면 열기</Link>
      </div>
    </header>
    <section className="results-summary">
      <div className="league-summary-title">
        <span>
          <CalendarDays />
        </span>
        <div>
          <h2>{leagueTitle(league.round_number)}{" "}
            <em>{league.status === "COMPLETED" ? "완료" : "진행 중"}</em>
          </h2>
          <p>일자　　{date}</p>
          <p>경기 방식　 {league.format === "SINGLE_ELIMINATION" ? "토너먼트" : "풀리그"}　·　{league.default_match_rule === "BO5" ? "5판 3선승" : "3판 2선승"}</p>
        </div>
      </div>
      <article>
        <span className="green">
          <Users />
        </span>
        <div>
          <small>참가자</small>
          <strong>{participants.length}명</strong>
        </div>
      </article>
      <article className="completed-progress">
        <span className="orange">
          <CheckCircle2 />
        </span>
        <div>
          <small>완료 경기</small>
          <strong>{done} / {total} 경기</strong>
          <div>
            <i style={{ width: `${pct}%` }} />
          </div>
          <em>{pct}%</em>
        </div>
      </article>
      <article>
        <span className="blue">
          <Medal />
        </span>
        <div>
          <small>남은 경기</small>
          <strong>{total - done} 경기</strong>
          <p>
            <Info />
            순위는 실시간으로 업데이트됩니다.</p>
        </div>
      </article>
    </section>
    <div className="results-layout">
      <section className="ranking-panel">
        <h2>실시간 순위</h2>
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>선수</th>
                <th>경기</th>
                <th>승</th>
                <th>패</th>
                <th>세트 득실</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>{visibleStandings.map(row => <tr key={row.playerId}>
              <td>
                <span className={`rank-badge rank-${row.rank}`}>{row.rank}</span>
              </td>
              <td>
                <Link href={`/admin/players/${row.playerId}`}>{row.name} {row.division && `(${row.division})`}</Link>
              </td>
              <td>{row.matchesPlayed}</td>
              <td className="wins">{row.wins}</td>
              <td>{row.losses}</td>
              <td>{row.setDifference > 0 ? "+" : ""}{row.setDifference}</td>
              <td>-</td>
            </tr>)}</tbody>
          </table>
        </div>
        <footer>
          <span>총 {standings.length}명</span>
          <div>
            {currentPage === 1 ? <button disabled aria-label="이전 페이지">‹</button> : <Link href={`?page=${currentPage - 1}`} aria-label="이전 페이지">‹</Link>}
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => page === currentPage ? <button className="active" key={page}>{page}</button> : <Link href={`?page=${page}`} key={page}>{page}</Link>)}
            {currentPage === totalPages ? <button disabled aria-label="다음 페이지">›</button> : <Link href={`?page=${currentPage + 1}`} aria-label="다음 페이지">›</Link>}
          </div>
          <label>10개씩 보기⌄</label>
        </footer>
      </section>
      <aside className="ranking-rules">
        <section>
          <h2>순위 규칙</h2>
          <ol>
            <li>
              <b>1 순위</b>
              <span>전체 승수</span>
            </li>
            <li>
              <b>2 순위 (동률 2명)</b>
              <span>상대전적 승자 우선</span>
            </li>
            <li>
              <b>3 순위 (동률 3명 이상)</b>
              <span>동률 선수끼리의 승수</span>
            </li>
            <li>
              <b>4 순위</b>
              <span>세트 득실（득실 = 세트 득 - 세트 실）</span>
            </li>
            <li>
              <b>5 순위</b>
              <span>전체 리그 세트 득실</span>
            </li>
            <li>
              <b>6 순위</b>
              <span>완전히 동일한 경우 공동 순위</span>
            </li>
          </ol>
        </section>
        <section className="ranking-tip">
          <h3>💡 TIP</h3>
          <p>선수를 클릭하면
            <br />
            개인 상세 화면으로 이동합니다.</p>
          <span>🏓</span>
        </section>
      </aside>
    </div>
  </div>;
}
