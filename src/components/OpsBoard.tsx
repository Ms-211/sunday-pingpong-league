"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Filter, Search, UserRound } from "lucide-react";
import { ScoreEntryModal } from "@/components/ScoreEntryModal";
import { calculateStandings } from "@/domain/standings/calculateStandings";
import { toMatch, toMatchResults, toParticipant } from "@/lib/league-mappers";
import { createClient } from "@/lib/supabase/browser";
import { pinchScale } from "@/lib/board-zoom";
import type { MatchWithResultRecord, ParticipantRecord } from "@/lib/league-mappers";
import type { Match, MatchResult, Participant } from "@/types/domain";

type RawMatch = MatchWithResultRecord & {
  group_no?: number;
  stage?: "PRELIMINARY" | "FINAL";
  match_rule?: "BO3" | "BO5";
};

type RawLeague = {
  id: string;
  round_number: number;
  league_date: string;
  status: string;
  league_participants: ParticipantRecord[];
  matches: RawMatch[];
};

const resultOf = (match: RawMatch) => {
  const r = match.match_results;
  return r?.result_type === "FORFEIT" && r.winner_id ? { ...r, player_a_sets: Number(r.winner_id === match.player_a_id), player_b_sets: Number(r.winner_id === match.player_b_id) } : r;
};

export function mobileMatches(matches: RawMatch[], players: ParticipantRecord[], query: string, group: string, status: string) {
  const ids = new Set(players.filter(player => player.name_snapshot.includes(query.trim())).map(player => player.player_id));
  return matches.filter(match => (group === "all" || (match.group_no ?? 1) === Number(group))
    && (status === "all" || Boolean(match.match_results) === (status === "done"))
    && (!query.trim() || ids.has(match.player_a_id) || ids.has(match.player_b_id)))
    .sort((a, b) => a.round_no - b.round_no || (a.group_no ?? 1) - (b.group_no ?? 1) || a.round_match_no - b.round_match_no);
}

export function calculateGroupStandings(participants: Participant[], matches: Array<Match & { groupNo: number }>, results: MatchResult[]) {
  return new Map([...Map.groupBy(matches, match => match.groupNo)].map(([groupNo, groupMatches]) => {
    const playerIds = new Set(groupMatches.flatMap(match => [match.playerAId, match.playerBId]));
    const matchIds = new Set(groupMatches.map(match => match.id));
    return [groupNo, calculateStandings(participants.filter(player => playerIds.has(player.playerId)), groupMatches, results.filter(result => matchIds.has(result.matchId)))];
  }));
}

export function OpsBoard({ league, finalizedSeason = false, readOnly = true }: { league: RawLeague; finalizedSeason?: boolean; readOnly?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    const db = createClient();
    if (!db) return;

    const channel = db
      .channel(`league-results-${league.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => router.refresh(),
      )
      .subscribe();
    const fallback = window.setInterval(() => router.refresh(), 5000);

    return () => {
      window.clearInterval(fallback);
      void db.removeChannel(channel);
    };
  }, [league.id, router]);

  const [query, setQuery] = useState("");
  const [unfinished, setUnfinished] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [mobileGroup, setMobileGroup] = useState("all");
  const [mobileStatus, setMobileStatus] = useState("pending");
  const [mobilePage, setMobilePage] = useState(0);
  const [showRankings, setShowRankings] = useState(false);
  const boardRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const [boardWidth, setBoardWidth] = useState<number>();

  useEffect(() => {
    const board = boardRef.current;
    const content = contentRef.current;
    if (!board || !content) return;
    const observer = new ResizeObserver(() => setBoardWidth(board.clientWidth));
    observer.observe(board);
    let pinch: { distance: number; scale: number; x: number; y: number } | null = null;
    const measure = (event: TouchEvent) => {
      const [a, b] = Array.from(event.touches);
      const rect = board.getBoundingClientRect();
      return { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), x: (a.clientX + b.clientX) / 2 - rect.left, y: (a.clientY + b.clientY) / 2 - rect.top };
    };
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      const point = measure(event);
      const scale = Number(content.style.zoom) || 1;
      pinch = { distance: Math.max(1, point.distance), scale, x: (board.scrollLeft + point.x) / scale, y: (board.scrollTop + point.y - 44) / scale };
      suppressClick.current = true;
    };
    const move = (event: TouchEvent) => {
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const point = measure(event);
      const scale = pinchScale(pinch.scale, pinch.distance, point.distance);
      content.style.zoom = String(scale);
      board.scrollLeft = pinch.x * scale - point.x;
      board.scrollTop = pinch.y * scale - point.y + 44;
      setZoom(scale * 100);
    };
    const end = (event: TouchEvent) => { if (event.touches.length < 2) pinch = null; };
    board.addEventListener("touchstart", start, { passive: false });
    board.addEventListener("touchmove", move, { passive: false });
    board.addEventListener("touchend", end);
    board.addEventListener("touchcancel", end);
    return () => {
      observer.disconnect();
      board.removeEventListener("touchstart", start);
      board.removeEventListener("touchmove", move);
      board.removeEventListener("touchend", end);
      board.removeEventListener("touchcancel", end);
    };
  }, []);

  const participants = league.league_participants.map(toParticipant);
  const hasFinal = league.matches.some((match) => match.stage === "FINAL");
  const activeStage = hasFinal ? "FINAL" : "PRELIMINARY";
  const activeMatches = useMemo(
    () =>
      league.matches.filter(
        (match) => (match.stage ?? "PRELIMINARY") === activeStage,
      ),
    [activeStage, league.matches],
  );
  const matches = activeMatches.map((match) => ({
    ...toMatch(match),
    matchRule: match.match_rule ?? "BO3",
    groupNo: match.group_no ?? 1,
  }));
  const results = toMatchResults(activeMatches);
  const groupStandings = calculateGroupStandings(participants, matches, results);
  const names = new Map(
    participants.map((player) => [
      player.playerId,
      {
        name: player.name,
        division: player.division,
        position: player.schedulePosition,
      },
    ]),
  );
  const groupedRounds = useMemo(() => {
    const groups = new Map<number, Map<number, RawMatch[]>>();

    for (const match of activeMatches) {
      if (unfinished && resultOf(match)) continue;
      const groupNo = match.group_no ?? 1;
      const rounds = groups.get(groupNo) ?? new Map<number, RawMatch[]>();
      const roundMatches = rounds.get(match.round_no) ?? [];
      roundMatches.push(match);
      rounds.set(match.round_no, roundMatches);
      groups.set(groupNo, rounds);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([groupNo, rounds]) => ({
        groupNo,
        rounds: [...rounds.entries()].sort(([a], [b]) => a - b),
      }));
  }, [activeMatches, unfinished]);

  const selectedMatch = activeMatches.find((match) => match.id === selected);
  const filteredMatches = mobileMatches(activeMatches, league.league_participants, query, mobileGroup, mobileStatus);
  const pageCount = Math.max(1, Math.ceil(filteredMatches.length / 6));
  const page = Math.min(mobilePage, pageCount - 1);
  const done = results.length;
  const total = activeMatches.length;
  const progress = total ? Math.round((done / total) * 1000) / 10 : 0;
  const searchId = participants.find((player) =>
    player.name.includes(query.trim()),
  )?.playerId;
  const display = (id: string) => {
    const player = names.get(id)!;
    return `${player.name}${player.division ? ` (${player.division})` : ""}`;
  };
  const groupName = (groupNo: number) =>
    activeStage === "FINAL"
      ? groupNo === 1
        ? "상위부"
        : "하위부"
      : `${String.fromCharCode(64 + groupNo)}조`;

  return (
    <main className="ops-board">
      <header className="ops-top">
        <div className="ops-brand">
          <span className="ops-mascot" />
          <div>
            <h1>
              <em>조</em>&amp;<b>애플</b> 일요리그
            </h1>
            <p>
              제{league.round_number}회 · {league.league_date} ·{" "}
              {activeStage === "FINAL" ? "본선" : "예선"}
            </p>
          </div>
        </div>
        <section className="ops-progress">
          <small>{activeStage === "FINAL" ? "본선" : "예선"} 진행률</small>
          <strong>
            {done} / {total} <em>경기 완료</em>
          </strong>
          <div>
            <i style={{ width: `${progress}%` }} />
          </div>
          <b>{progress}%</b>
        </section>
        <label className="ops-search">
          <span>
            <UserRound />내 경기 찾기
          </span>
          <div>
            <Search />
            <input
              aria-label="선수 이름으로 검색"
              placeholder="선수 이름으로 검색"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setMobilePage(0); }}
            />
          </div>
        </label>
        <button
          aria-pressed={unfinished}
          className={unfinished ? "active" : ""}
          onClick={() => setUnfinished((value) => !value)}
        >
          <Filter />미완료만 보기
        </button>
        <div className="ops-header-legend">
          <span>
            <i className="complete">
              <Check />
            </i>
            완료
          </span>
          <span>
            <i />미완료
          </span>
          <span>
            <i className="forfeit">−</i>몰수
          </span>
        </div>
      </header>

      <div className="ops-content">
        <section className="mobile-match-queue" aria-label="경기 찾기">
          <div className="mobile-match-filters">
            <label><span className="sr-only">조 선택</span><select value={mobileGroup} onChange={event => { setMobileGroup(event.target.value); setMobilePage(0); }}>
              <option value="all">모든 조</option>{[...groupStandings.keys()].sort((a,b) => a-b).map(group => <option key={group} value={group}>{groupName(group)}</option>)}
            </select></label>
            <label><span className="sr-only">경기 상태</span><select value={mobileStatus} onChange={event => { setMobileStatus(event.target.value); setMobilePage(0); }}><option value="pending">미완료 경기</option><option value="done">완료 경기</option><option value="all">전체 경기</option></select></label>
          </div>
          <h2>경기 찾기 <small>{filteredMatches.length}경기 · 라운드 관계없이 선택</small></h2>
          {filteredMatches.slice(page * 6, (page + 1) * 6).map(match => {
            const result = resultOf(match);
            return <button key={match.id} disabled={readOnly} onClick={() => setSelected(match.id)}>
              <small>{groupName(match.group_no ?? 1)} · {match.round_no}라운드 · {result ? "완료" : "미완료"}</small>
              <strong>{display(match.player_a_id)} <span>대</span> {display(match.player_b_id)}</strong>
              <span className={`queue-action${result ? " completed" : ""}`}>{result && <b>{result.result_type === "FORFEIT" ? "몰수" : `${result.player_a_sets} : ${result.player_b_sets}`}</b>}{readOnly ? (result ? "경기 결과" : "경기 예정") : result ? "결과 수정" : "결과 입력"}</span>
            </button>;
          })}
          {!filteredMatches.length && <p className="queue-empty">조건에 맞는 경기가 없습니다. 이름·조·상태를 확인해 주세요.</p>}
          {pageCount > 1 && <nav className="mobile-match-pages" aria-label="경기 목록 페이지">
            <button disabled={page === 0} onClick={() => setMobilePage(page - 1)}>이전</button>
            <label><span className="sr-only">경기 페이지</span><select value={page} onChange={event => setMobilePage(Number(event.target.value))}>{Array.from({length:pageCount}, (_,index) => <option key={index} value={index}>{index + 1} / {pageCount} 페이지</option>)}</select></label>
            <button disabled={page === pageCount - 1} onClick={() => setMobilePage(page + 1)}>다음</button>
          </nav>}
        </section>
        <section ref={boardRef} className="round-board grouped-round-board pinch-round-board" aria-label="확대·축소 대진표"
          onTouchStartCapture={event => { if (event.touches.length === 1) suppressClick.current = false; }}
          onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); } }}>
          <div className="board-zoom-controls">
            <span>두 손가락으로 확대·축소</span>
            <button className="mobile-board-zoom" aria-label="대진표 축소" disabled={zoom <= 30} onClick={() => setZoom(value => Math.max(30, value - 10))}>−</button>
            <button className="board-zoom-reset" onClick={() => { setZoom(100); if (boardRef.current) boardRef.current.scrollTo(0, 0); }} aria-label="대진표를 100%로 초기화">{Math.round(zoom)}%</button>
            <button className="mobile-board-zoom" aria-label="대진표 확대" disabled={zoom >= 300} onClick={() => setZoom(value => Math.min(300, value + 10))}>+</button>
          </div>

          <div ref={contentRef} className="round-groups" style={{ zoom: zoom / 100, width: boardWidth }}>
            {groupedRounds.map((group) => (
              <section className="round-group-row" key={group.groupNo}>
                <header>
                  <strong>{groupName(group.groupNo)}</strong>
                  <small>{activeStage === "FINAL" ? "본선 그룹" : "예선 그룹"}</small>
                </header>
                <div className="round-group-columns">
                  {group.rounds.map(([round, roundMatches]) => (
                    <article
                      className="round-column"
                      key={`${group.groupNo}-${round}`}
                    >
                      <header>
                        <h2>{round}라운드</h2>
                      </header>
                      <div>
                        {roundMatches
                          .sort((a, b) => a.round_match_no - b.round_match_no)
                          .map((match) => {
                            const result = resultOf(match);
                            const playerA = names.get(match.player_a_id)!;
                            const playerB = names.get(match.player_b_id)!;
                            const highlighted = Boolean(
                              searchId &&
                                (match.player_a_id === searchId ||
                                  match.player_b_id === searchId),
                            );

                            return (
                              <button
                                key={match.id}
                                aria-label={`${groupName(group.groupNo)} ${round}라운드 ${display(match.player_a_id)} 대 ${display(match.player_b_id)} ${readOnly ? (result ? "경기 결과" : "경기 예정") : result ? "결과 수정" : "결과 입력"}`}
                                className={`${result ? "done" : ""} ${highlighted ? "highlight" : ""}`}
                                disabled={readOnly} onClick={() => setSelected(match.id)}
                              >
                                <p
                                  className={
                                    result
                                      ? result.player_a_sets > result.player_b_sets
                                        ? "winner"
                                        : "loser"
                                      : ""
                                  }
                                >
                                  <span>
                                    {result ? (
                                      <i>
                                        <Check />
                                      </i>
                                    ) : (
                                      <b>{names.get(match.player_a_id)?.position}</b>
                                    )}
                                    {playerA.name}{playerA.division && <small className="player-division">({playerA.division})</small>}
                                  </span>
                                  {result && <em>{result.result_type === "FORFEIT" ? (result.player_a_sets > result.player_b_sets ? "몰수승" : "몰수패") : result.player_a_sets}</em>}
                                </p>
                                <p
                                  className={
                                    result
                                      ? result.player_b_sets > result.player_a_sets
                                        ? "winner"
                                        : "loser"
                                      : ""
                                  }
                                >
                                  <span>
                                    {result ? (
                                      <i>
                                        <Check />
                                      </i>
                                    ) : (
                                      <b>{names.get(match.player_b_id)?.position}</b>
                                    )}
                                    {playerB.name}{playerB.division && <small className="player-division">({playerB.division})</small>}
                                  </span>
                                  {result && <em>{result.result_type === "FORFEIT" ? (result.player_b_sets > result.player_a_sets ? "몰수승" : "몰수패") : result.player_b_sets}</em>}
                                </p>
                              </button>
                            );
                          })}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
        <button className="mobile-rankings-toggle" aria-expanded={showRankings} aria-controls="group-rankings" onClick={() => setShowRankings(value => !value)}>실시간 순위 {showRankings ? "접기" : "보기"}</button>
        <aside id="group-rankings" className={`group-rankings${showRankings ? " mobile-open" : ""}`} aria-label="조별 실시간 순위">
          <header><h2>실시간 순위</h2><span>{activeStage === "FINAL" ? "본선" : "예선"}</span></header>
          <div>{[...groupStandings].sort(([a],[b])=>a-b).map(([groupNo,standings])=><section className="group-ranking" key={groupNo} aria-label={`${groupName(groupNo)} 실시간 순위`}>
            <header><h2>{groupName(groupNo)} 순위</h2><span>승점</span></header>
            {standings.map((row,index)=><p key={row.playerId}><b>#{index+1}</b><strong><Link href={`/admin/players/${row.playerId}`}>{row.name}</Link></strong><em>{row.wins*3}</em></p>)}
          </section>)}</div>
        </aside>
      </div>

      {!readOnly && selectedMatch && (
        <ScoreEntryModal
          matchId={selectedMatch.id}
          finalizedSeason={finalizedSeason}
          initialType={selectedMatch.match_results?.result_type}
          leagueId={league.id}
          round={selectedMatch.round_no}
          playerA={display(selectedMatch.player_a_id)}
          playerB={display(selectedMatch.player_b_id)}
          initialA={resultOf(selectedMatch)?.player_a_sets}
          initialB={resultOf(selectedMatch)?.player_b_sets}
          matchRule={selectedMatch.match_rule ?? "BO3"}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
