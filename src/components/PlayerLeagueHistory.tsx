"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";

type History = { leagueId: string; date: string; round: number; rank?: number; wins: number; losses: number };

export function PlayerLeagueHistory({ history }: { history: History[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(history.length / 6);
  const visible = history.slice((page - 1) * 6, page * 6);
  return <>
    <div className="profile-history-grid">{visible.map(item => <Link className="profile-history-row" key={item.leagueId} href={`/leagues/${item.leagueId}`}>
      <span className={`history-rank ${item.rank === 1 ? "first" : ""}`}>{item.rank === 1 ? <Trophy size={22}/> : item.rank ? `${item.rank}위` : "—"}</span>
      <div><strong>제{item.round}회 일요리그</strong><p>{item.date}</p></div>
      <span className="history-result"><b>{item.wins}승</b> {item.losses}패</span><ChevronRight size={18}/>
    </Link>)}</div>
    {totalPages > 1 && <nav className="profile-history-pagination" aria-label="리그별 참가 이력 페이지">
      <button type="button" onClick={() => setPage(value => value - 1)} disabled={page === 1}><ChevronLeft size={17}/>이전</button>
      <strong aria-live="polite">{page} / {totalPages}</strong>
      <button type="button" onClick={() => setPage(value => value + 1)} disabled={page === totalPages}>다음<ChevronRight size={17}/></button>
    </nav>}
  </>;
}
