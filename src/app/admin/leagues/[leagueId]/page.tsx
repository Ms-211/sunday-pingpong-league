import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { forceCompleteLeague, setLeagueStatus } from "@/app/actions";
import { LeagueDeleteForm } from "@/components/LeagueDeleteForm";
import { StandingTable } from "@/components/LeagueView";
import { MatchRuleChanger } from "@/components/MatchRuleChanger";
import { canCompleteLeague } from "@/domain/canCompleteLeague";
import { getLeague } from "@/lib/data";
import { leagueTitle } from "@/lib/format";
import type { MatchRule } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const league = await getLeague(leagueId);
  if (!league) notFound();
  const done = league.matches.filter(match => Boolean(match.match_results)).length;
  const canComplete = canCompleteLeague({ status: league.status, stageMode: league.stage_mode, finalsGenerated: league.finals_generated, totalMatches: league.matches.length, completedMatches: done });
  const percent = league.matches.length ? Math.round(done / league.matches.length * 100) : 0;
  const format = league.format === "SINGLE_ELIMINATION" ? "토너먼트" : "풀리그";
  const stage = league.stage_mode === "PRELIMINARY_FINAL" ? "예선 + 본선" : "단일 리그";
  const rule = (league.default_match_rule ?? "BO3") as MatchRule;
  const statusLabel = league.status === "DRAFT" ? "생성 중" : league.status === "IN_PROGRESS" ? "진행 중" : league.completion_type === "FORCED" ? "강제 완료" : "완료";

  return <div className="league-manage-page admin-page">
    <header className="league-manage-header admin-page-header"><div><Link className="league-manage-back" href="/admin/leagues"><ChevronLeft/>리그 전체 목록</Link><h1>{leagueTitle(league.round_number)}</h1><p><span className={`complete-status status-${league.completion_type === "FORCED" ? "forced" : league.status.toLowerCase()}`}>{statusLabel}</span>{league.league_date} · 참가자 {league.league_participants.length}명</p></div><div className="league-manage-actions">{league.status === "DRAFT"&&<><Link className="btn secondary" href={`/admin/leagues/new?leagueId=${leagueId}`}>기본 정보 수정</Link><Link className="btn" href={`/admin/leagues/${leagueId}/participants`}>참가자 관리</Link></>}{league.status === "IN_PROGRESS"&&<Link className="btn" href={`/ops/${leagueId}`}>현장 화면</Link>}{league.status === "COMPLETED"&&<Link className="btn secondary" href={`/leagues/${leagueId}`}>결과 보기</Link>}</div></header>

    <div className="league-manage-content"><section className="league-manage-overview">
      <div className="league-manage-info"><header><div className="league-section-title"><h2>리그 기본 정보</h2>{league.status === "IN_PROGRESS"&&<MatchRuleChanger leagueId={leagueId} current={rule}/>}</div>{league.status === "DRAFT"&&<Link href={`/admin/leagues/new?leagueId=${leagueId}`}>수정</Link>}</header><dl><div><dt>회차</dt><dd>제{league.round_number}회</dd></div><div><dt>리그 날짜</dt><dd>{league.league_date}</dd></div><div><dt>경기 방식</dt><dd>{format}</dd></div><div><dt>리그 구성</dt><dd>{stage}</dd></div><div><dt>경기 규칙</dt><dd>{rule === "BO5" ? "5판 3선승" : "3판 2선승"}</dd></div><div><dt>참가자</dt><dd>{league.league_participants.length}명</dd></div></dl></div>
      <aside className="league-manage-progress"><header><h2>운영 현황</h2><strong>{percent}%</strong></header><div className="progress"><i style={{width:`${percent}%`}}/></div><p><b>{done}</b> / {league.matches.length} 경기 완료</p>{league.status === "IN_PROGRESS"&&<div><form action={setLeagueStatus.bind(null,leagueId,"COMPLETED")}><button className="btn red" disabled={!canComplete}>리그 완료</button></form>{!canComplete&&<form action={forceCompleteLeague.bind(null,leagueId)}><button className="btn secondary">강제 완료</button></form>}</div>}{league.status === "DRAFT"&&<p className="league-manage-note">참가자와 그룹을 구성하면 리그가 시작됩니다.</p>}{league.status === "COMPLETED"&&<p className="league-manage-note">종료된 리그는 조회만 가능합니다.</p>}</aside>
    </section>

    {league.matches.length>0&&<section className="league-manage-board"><header><div className="league-section-title"><h2>참가자 및 대진</h2>{league.status === "IN_PROGRESS"&&done===0&&!league.finals_generated&&<Link className="btn secondary" href={`/admin/leagues/${leagueId}/participants`}>대진표 수정</Link>}</div><span>{done}/{league.matches.length} 경기</span></header><StandingTable league={league}/></section>}</div>

    {league.status!=="COMPLETED"&&<section className="league-danger-zone"><div><h2>리그 삭제</h2><p>운영상 잘못 생성된 리그를 영구 삭제합니다.</p></div><LeagueDeleteForm id={leagueId} round={league.round_number} status={league.status}/></section>}
  </div>;
}
