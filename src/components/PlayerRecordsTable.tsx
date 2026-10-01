"use client";

import Link from "next/link";
import { CalendarDays, Trophy, Users } from "lucide-react";
import { useMemo, useState } from "react";

export type PlayerRecord = { id: string; name: string; division: string | null; affiliation: string | null; appearances: number; games: number; wins: number; losses: number; setsWon: number; setsLost: number; championships: number };
type Period = { id:string; name:string; rows:PlayerRecord[] };
export function sortPlayerRecords(rows:PlayerRecord[],sort:string){return [...rows].sort((a,b)=>sort==="name"?a.name.localeCompare(b.name,"ko"):sort==="affiliation"?(a.affiliation??"\uffff").localeCompare(b.affiliation??"\uffff","ko")||a.name.localeCompare(b.name,"ko"):b.championships-a.championships||b.wins-a.wins||a.name.localeCompare(b.name,"ko"))}

export function PlayerRecordRows({ rows, admin }: { rows: PlayerRecord[]; admin: boolean }) {
  return rows.map(player => {
    const href=`${admin?"/admin":""}/players/${player.id}`;
    return <tr key={player.id} onClick={event=>{if(!(event.target as HTMLElement).closest("a"))window.location.assign(href)}}>
      <td><span className="record-player"><Link href={href}><strong>{player.name}</strong></Link></span></td>
      <td>{player.affiliation??"-"}</td><td className="optional-attendance">{player.appearances}<small>회</small></td><td>{player.games}</td><td className="record-wins">{player.wins}</td><td>{player.losses}</td><td>{player.games?(player.wins/player.games*100).toFixed(1):"0.0"}%</td><td>{player.setsWon+player.setsLost?(player.setsWon/(player.setsWon+player.setsLost)*100).toFixed(1):"0.0"}%</td><td>{player.championships?<span className="championship-count">{player.championships}</span>:"-"}</td>
    </tr>;
  });
}

function MobilePlayerRecords({ rows, admin }: { rows: PlayerRecord[]; admin: boolean }) {
  return <ul className="mobile-player-records">{rows.map(player => <li key={player.id}>
    <div><Link href={`${admin ? "/admin" : ""}/players/${player.id}`}>{player.name}</Link><strong>{player.games ? (player.wins / player.games * 100).toFixed(1) : "0.0"}% <small>승률</small></strong></div>
    <p><span>{player.games}경기 · <b>{player.wins}승</b> {player.losses}패</span><span>참가 {player.appearances}회 · 우승 {player.championships}회</span></p>
    <details><summary>세부 기록</summary><p>{player.affiliation ?? "소속 미등록"} · 세트 {player.setsWon}승 {player.setsLost}패 · 세트 승률 {player.setsWon + player.setsLost ? (player.setsWon / (player.setsWon + player.setsLost) * 100).toFixed(1) : "0.0"}%</p></details>
  </li>)}</ul>;
}

export function PlayerRecordsPanel({ periods, initialPeriod, admin }: { periods:Period[]; initialPeriod:string; admin:boolean }) {
  const [period,setPeriod]=useState(initialPeriod);
  const [sort,setSort]=useState("championships");
  const active=periods.find(item=>item.id===period)??periods[0];
  const rows=useMemo(()=>sortPlayerRecords(active?.rows??[],sort),[active,sort]);
  return <section className="card season-records"><div className="season-section-heading"><div><h2><Users size={22}/>전체 선수 기록표 <span className="event-count">{rows.length}명</span></h2><p>선수를 선택하면 상세 기록을 확인할 수 있어요.</p></div><div className="player-record-controls"><label><CalendarDays size={18}/><span className="sr-only">통계 기간</span><select aria-label="통계 기간" value={active?.id??""} onChange={event=>setPeriod(event.target.value)}>{periods.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span className="sr-only">정렬</span><select aria-label="선수 정렬" value={sort} onChange={event=>setSort(event.target.value)}><option value="name">이름 가나다순</option><option value="affiliation">소속순</option><option value="championships">우승자순</option></select></label></div></div><MobilePlayerRecords rows={rows} admin={admin}/><div className="stats-table"><table><thead><tr><th>선수</th><th>소속</th><th className="optional-attendance">참가</th><th>경기</th><th>승</th><th>패</th><th>승률</th><th>세트 승률</th><th>우승</th></tr></thead><tbody><PlayerRecordRows rows={rows} admin={admin}/></tbody></table></div>{!rows.length&&<div className="records-empty"><Trophy size={32}/><strong>완료된 리그가 없습니다.</strong><p>리그를 마치면 선수들의 기록이 이곳에 모입니다.</p></div>}</section>;
}
