import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Gamepad2, Trophy, Users } from "lucide-react";
import { setLeagueStatus } from "@/app/actions";
import { canCompleteLeague } from "@/domain/canCompleteLeague";
import { getAdminDashboard } from "@/lib/data";
import { leagueTitle } from "@/lib/format";

export const dynamic="force-dynamic";
const koDate=(value:string)=>new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",weekday:"short"}).format(new Date(`${value}T00:00:00`));

export default async function Page(){
  const{leagues}=await getAdminDashboard();
  const active=leagues.find(l=>l.status==="IN_PROGRESS");
  const completed=leagues.filter(l=>l.status==="COMPLETED").sort((a,b)=>b.league_date.localeCompare(a.league_date));
  const matches=active?.matches??[];
  const done=matches.filter(m=>Boolean(m.match_results)).length;
  const participants=active?.league_participants?.[0]?.count??0;
  const progress=matches.length?Math.round(done/matches.length*100):0;
  const canComplete=active?canCompleteLeague({status:active.status,stageMode:active.stage_mode,finalsGenerated:active.finals_generated,totalMatches:matches.length,completedMatches:done}):false;
  return <div className="dashboard-page admin-page">
    <header className="dashboard-header admin-page-header"><div><h1>대시보드</h1><p>조&amp;애플 일요리그 관리에 오신 것을 환영합니다!</p></div></header>

    <section className="dashboard-columns">
      <article className="dashboard-panel active-panel"><div className="panel-title"><h2>진행 중 리그</h2>{active&&<span>진행 중</span>}</div>{active?<>
        <div className="active-summary"><div><h3>{leagueTitle(active.round_number)}</h3><p><CalendarDays/> {koDate(active.league_date)} 시작</p><p><Gamepad2/> {active.default_match_rule === "BO5" ? "5판 3선승" : "3판 2선승"} {active.format === "SINGLE_ELIMINATION" ? "토너먼트" : "풀리그"}</p></div><div className="progress-ring" style={{"--progress":`${progress*3.6}deg`} as React.CSSProperties}><strong>{progress}%</strong></div><small>{done} / {matches.length} 경기 완료</small></div>
        <div className="active-detail-list"><p><Users/>참가 선수<strong>{participants}명</strong><ChevronRight/></p><p><Gamepad2/>총 경기 수<strong>{matches.length}경기</strong><ChevronRight/></p><p><CheckCircle2/>완료된 경기<strong>{done}경기</strong><ChevronRight/></p><p><CalendarDays/>남은 경기<strong>{matches.length-done}경기</strong><ChevronRight/></p></div>
        <div className="active-panel-actions"><Link href={`/ops/${active.id}`}><ClipboardList/>대진표 보기</Link>{canComplete&&<form action={setLeagueStatus.bind(null,active.id,"COMPLETED")}><button type="submit"><CheckCircle2/>리그 종료</button></form>}</div>
      </>:<div className="dashboard-empty"><Trophy/><h3>진행 중인 리그가 없습니다</h3><Link href="/admin/leagues/new">새 리그 만들기</Link></div>}</article>

      <article className="dashboard-panel recent-panel"><div className="panel-title"><h2>최근 완료 리그</h2><Link href="/admin/leagues">전체 보기</Link></div><div className="completed-list">{completed.slice(0,5).map((league,index)=><Link href={`/leagues/${league.id}`} key={league.id} className="completed-item"><span className={`medal medal-${index+1}`}>{index+1}</span><div><strong>{leagueTitle(league.round_number)}</strong><small className="completed-meta"><span>{koDate(league.league_date)}</span><span>참가 {league.league_participants?.[0]?.count??0}명</span><span>총 {league.matches.length}경기</span></small></div><em>완료</em><ChevronRight/></Link>)}</div></article>
    </section>

  </div>;
}
