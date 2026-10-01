"use client";

import Link from "next/link";
import { useMemo,useState } from "react";
import { CalendarDays,ChevronLeft,ChevronRight,ExternalLink,Gamepad2,RotateCcw,Search,Trophy,Users } from "lucide-react";
import { deleteDraftLeague, forceCompleteLeague } from "@/app/actions";

export type CompletedLeague={id:string;round:number;date:string;status:"DRAFT"|"IN_PROGRESS"|"COMPLETED";completionType:"NORMAL"|"FORCED";participants:number;matches:number;winners:string[]};
const koDate=(date:string)=>new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",weekday:"short"}).format(new Date(`${date}T00:00:00`));

export function CompletedLeaguesManager({leagues}:{leagues:CompletedLeague[]}){
  const[query,setQuery]=useState("");const[year,setYear]=useState("all");const[month,setMonth]=useState("all");const[sort,setSort]=useState("newest");const[page,setPage]=useState(1);const pageSize=8;
  const years=[...new Set(leagues.map(league=>league.date.slice(0,4)))].sort((a,b)=>b.localeCompare(a));
  const filtered=useMemo(()=>{
    const keyword=query.trim().toLowerCase();
    return leagues.filter(league=>(year==="all"||league.date.startsWith(year))&&(month==="all"||league.date.slice(5,7)===month)&&(!keyword||`${league.round}회 조&애플 일요리그 ${league.winners.join(" ")}`.toLowerCase().includes(keyword))).sort((a,b)=>sort==="newest"?b.date.localeCompare(a.date):a.date.localeCompare(b.date));
  },[leagues,month,query,sort,year]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));const safePage=Math.min(page,totalPages);const visible=filtered.slice((safePage-1)*pageSize,safePage*pageSize);
  const update=(setter:(value:string)=>void)=>(value:string)=>{setter(value);setPage(1)};
  const reset=()=>{setQuery("");setYear("all");setMonth("all");setSort("newest");setPage(1)};
  const totalParticipants=leagues.reduce((sum,league)=>sum+league.participants,0);const totalMatches=leagues.reduce((sum,league)=>sum+league.matches,0);const latest=[...leagues].sort((a,b)=>b.date.localeCompare(a.date))[0];
  return <div className="league-list-page admin-page">
    <header className="league-list-header admin-page-header"><div><h1>리그 전체 목록</h1><p>생성된 모든 리그의 진행 상태와 결과를 확인하세요.</p></div><span><Trophy/></span></header>
    <section className="league-list-filters">
      <label><Search/><input value={query} onChange={event=>update(setQuery)(event.target.value)} placeholder="회차, 날짜, 우승자 검색"/></label>
      <select aria-label="연도" value={year} onChange={event=>update(setYear)(event.target.value)}><option value="all">전체 연도</option>{years.map(value=><option value={value} key={value}>{value}년</option>)}</select>
      <select aria-label="월" value={month} onChange={event=>update(setMonth)(event.target.value)}><option value="all">전체 월</option>{Array.from({length:12},(_,index)=>String(index+1).padStart(2,"0")).map(value=><option value={value} key={value}>{Number(value)}월</option>)}</select>
      <select aria-label="정렬" value={sort} onChange={event=>update(setSort)(event.target.value)}><option value="newest">최신순</option><option value="oldest">오래된순</option></select>
      <button type="button" onClick={reset}><RotateCcw/>필터 초기화</button>
    </section>
    <section className="league-list-stats">
      <article><span className="red"><Trophy/></span><div><small>전체 리그</small><strong>{leagues.length}<em>회</em></strong><p>{leagues.length?`${leagues.at(-1)?.date.slice(0,7)} ~ ${leagues[0]?.date.slice(0,7)}`:"생성된 리그 없음"}</p></div></article>
      <article><span className="blue"><Users/></span><div><small>누적 참가자</small><strong>{totalParticipants.toLocaleString()}<em>명</em></strong><p>회차별 참가 인원 합계</p></div></article>
      <article><span className="green"><Gamepad2/></span><div><small>전체 경기 수</small><strong>{totalMatches.toLocaleString()}<em>경기</em></strong><p>생성된 대진 누적 기준</p></div></article>
      <article><span className="orange"><CalendarDays/></span><div><small>최근 리그 날짜</small><strong className="date-value">{latest?koDate(latest.date):"-"}</strong><p>{latest?`제${latest.round}회`:"완료 기록 없음"}</p></div></article>
    </section>
    <section className="league-list-table-card">
      <div className="league-list-table-wrap"><table><thead><tr><th>순번</th><th>리그명</th><th>날짜</th><th>참가자</th><th>총 경기 수</th><th>우승자</th><th>상태</th><th>관리</th></tr></thead><tbody>{visible.map((league,index)=>{
        const rank=(safePage-1)*pageSize+index+1;
        const detailHref=`/admin/leagues/${league.id}`;
        const actionHref=league.status==="DRAFT"?`/admin/leagues/${league.id}/participants`:league.status==="IN_PROGRESS"?`/ops/${league.id}`:`/leagues/${league.id}`;
        const statusLabel=league.status==="DRAFT"?"생성 중":league.status==="IN_PROGRESS"?"진행 중":league.completionType==="FORCED"?"강제 완료":"완료";
        const actionLabel=league.status==="DRAFT"?"계속 설정":league.status==="IN_PROGRESS"?"대진표 보기":"결과 보기";
        return <tr key={league.id}><td><span className={`league-rank rank-${rank}`}>{rank}</span></td><td><strong><a className="league-detail-link" href={detailHref}>제{league.round}회 조&amp;애플 일요리그</a></strong></td><td>{koDate(league.date)}</td><td>{league.participants}명</td><td>{league.matches}경기</td><td>{league.winners.join(", ")||"-"}</td><td><em className={`complete-status status-${league.completionType==="FORCED"?"forced":league.status.toLowerCase()}`}>{statusLabel}</em></td><td><div className="league-row-actions"><Link href={actionHref}>{actionLabel}</Link>{league.status==="IN_PROGRESS"&&<form action={forceCompleteLeague.bind(null,league.id)} onSubmit={event=>{if(!window.confirm(`제${league.round}회 리그를 강제로 완료하시겠습니까?\n미완료 경기는 결과 없이 남습니다.`))event.preventDefault()}}><button type="submit" className="force-complete">강제 완료</button></form>}{league.status==="DRAFT"&&<form action={deleteDraftLeague.bind(null,league.id)} onSubmit={event=>{if(!window.confirm(`제${league.round}회 생성 중 리그를 삭제하시겠습니까?\n삭제한 리그는 복구할 수 없습니다.`))event.preventDefault()}}><button type="submit" className="delete-draft">삭제</button></form>}<Link href={actionHref} target="_blank" aria-label={`새 창에서 ${actionLabel}`}><ExternalLink/></Link><a href={detailHref} aria-label={`제${league.round}회 리그 관리`}><ChevronRight/></a></div></td></tr>;
      })}{visible.length===0&&<tr><td colSpan={8} className="league-list-empty">조건에 맞는 리그가 없습니다.</td></tr>}</tbody></table></div>
      <footer><div className="league-pagination"><button disabled={safePage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}><ChevronLeft/></button>{Array.from({length:totalPages},(_,index)=>index+1).map(value=><button className={value===safePage?"active":""} key={value} onClick={()=>setPage(value)}>{value}</button>)}<button disabled={safePage===totalPages} onClick={()=>setPage(value=>Math.min(totalPages,value+1))}><ChevronRight/></button></div></footer>
    </section>
  </div>;
}
