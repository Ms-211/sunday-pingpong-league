"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight, Gamepad2, GitBranch, GripVertical, Info, Layers3, Medal, Shuffle, Target, Trophy, Users } from "lucide-react";
import { DragEvent, FormEvent, useMemo, useState, useTransition } from "react";
import { createScheduleFromParticipants, rebuildScheduleFromParticipants } from "@/app/actions";
import { getRoundRobinSummary } from "@/domain/round-robin/generateRoundRobin";
import { getTournamentSummary } from "@/domain/tournament/generateTournamentRound";
import { formatDivision } from "@/lib/format";
import type { LeagueFormat, MatchRule } from "@/types/domain";

type Player = { id: string; name: string; division: string | null };
type League = {
  id: string;
  roundNumber: number;
  format: LeagueFormat;
  defaultRule: MatchRule;
  stageMode: "SINGLE" | "PRELIMINARY_FINAL";
  status: "DRAFT" | "IN_PROGRESS";
};

export function ParticipantsManager({ league, players, initialIds, initialGroupSize }: { league: League; players: Player[]; initialIds: string[]; initialGroupSize: number }) {
  const [orderedIds, setOrderedIds] = useState(initialIds);
  const [groupSize, setGroupSize] = useState(initialGroupSize);
  const editing=league.status==="IN_PROGRESS";
  const format = league.format;
  const rule = league.defaultRule;
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const groups = useMemo(() => { const output: string[][] = []; for (let index = 0; index < orderedIds.length; index += groupSize) output.push(orderedIds.slice(index, index + groupSize)); return output; }, [orderedIds, groupSize]);
  const playerMap = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);
  const shuffle = () => setOrderedIds(ids => { const copy = [...ids]; for (let index = copy.length - 1; index > 0; index--) { const target = Math.floor(Math.random() * (index + 1)); [copy[index], copy[target]] = [copy[target], copy[index]]; } return copy; });
  const movePlayer = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setOrderedIds(ids => {
      const from = ids.indexOf(draggedId); const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) return ids;
      const next = [...ids]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
      return next;
    });
  };
  const moveStep = (index: number, direction: number) => setOrderedIds(ids => movePlayerStep(ids, index, direction));
  const beginDrag = (event: DragEvent<HTMLElement>, id: string) => { setDraggedId(id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id); };
  const groupMatches = (count: number) => (format === "ROUND_ROBIN" ? getRoundRobinSummary(count) : getTournamentSummary(count)).matches;
  const totalMatches = groups.reduce((sum, group) => sum + groupMatches(group.length), 0);
  const hasOddGroup = groups.some(group=>group.length%2===1);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      try { await (editing?rebuildScheduleFromParticipants:createScheduleFromParticipants)(league.id, formData); }
      catch (reason) { setError(reason instanceof Error ? reason.message : "대진표 생성에 실패했습니다. 다시 시도해 주세요."); }
    });
  };

  return <div className="participants-page group-builder-page admin-page">
    <header className="workflow-header admin-page-header"><div><h1>{editing?"대진표 수정":"참가자 순서 및 그룹 구성"}</h1><p>홈 <ChevronRight /> 리그 관리 <ChevronRight /> {editing?"대진표 수정":"그룹 구성"}</p></div><div><Link href={editing?`/admin/leagues/${league.id}`:`/admin/leagues/new?leagueId=${league.id}`}>이전</Link><button form="participants-form" disabled={isPending}>{isPending?"대진 생성 중...":editing?"대진표 다시 생성":"그룹별 대진 생성"}</button></div></header>
    <div className="participant-steps"><span><b>1</b><strong>참가자 선택<small>{orderedIds.length}명 선택 완료</small></strong></span><span className="active"><b>2</b><strong>순서 섞기<small>참가자 랜덤 배치</small></strong></span><span className="active"><b>3</b><strong>그룹 구성<small>그룹당 인원 설정</small></strong></span><span><b>4</b><strong>대진 생성<small>그룹별 대진 저장</small></strong></span></div>
    <form id="participants-form" onSubmit={submit} className="group-builder-grid">
      <input type="hidden" name="format" value={format} /><input type="hidden" name="default_match_rule" value={rule} /><input type="hidden" name="group_size" value={groupSize} />{orderedIds.map(id => <input key={id} type="hidden" name="playerIds" value={id} />)}
      <section className="group-order-panel"><header><div><h2>참가자 순서</h2><p>선수 순서를 바꿀 수 있습니다.</p></div><button type="button" onClick={shuffle}><Shuffle /> 랜덤 섞기</button></header><div>{orderedIds.map((id, index) => { const player = playerMap.get(id)!; return <article key={id} draggable className={draggedId===id?"dragging":""} onDragStart={event=>beginDrag(event,id)} onDragEnter={()=>movePlayer(id)} onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect="move"}} onDrop={event=>{event.preventDefault();movePlayer(id);setDraggedId(null)}} onDragEnd={()=>setDraggedId(null)}><GripVertical /><b>{index + 1}</b><strong><Link href={`/admin/players/${id}`}>{player.name}</Link></strong><span>{formatDivision(player.division)}</span><div className="mobile-order-actions"><button type="button" aria-label={`${player.name} 위로 이동`} disabled={index===0} onClick={()=>moveStep(index,-1)}><ArrowUp/></button><button type="button" aria-label={`${player.name} 아래로 이동`} disabled={index===orderedIds.length-1} onClick={()=>moveStep(index,1)}><ArrowDown/></button></div></article>; })}</div></section>
      <section className="group-preview-panel"><header><div><h2>그룹 구성 미리보기</h2><p>순서대로 그룹당 설정 인원만큼 자동 배정됩니다.</p></div><label>그룹당 인원<select value={groupSize} onChange={event => setGroupSize(Number(event.target.value))}>{Array.from({ length: Math.max(1, orderedIds.length - 1) }, (_, index) => index + 2).filter(value => value <= orderedIds.length).map(value => <option key={value} value={value}>{value}명</option>)}</select></label></header><div className="group-cards">{groups.map((group, groupIndex) => <article key={groupIndex}><header><strong>{String.fromCharCode(65 + groupIndex)}그룹</strong><span>{group.length}명 · {groupMatches(group.length)}경기</span></header>{group.map((id, index) => { const player = playerMap.get(id)!; return <p key={id}><b>{index + 1}</b><strong><Link href={`/admin/players/${id}`}>{player.name}</Link></strong><span>{formatDivision(player.division)}</span></p>; })}</article>)}</div></section>
      <aside className="league-side-summary bracket-summary"><h2>대진 요약</h2><div className="bracket-summary-hero"><span><Trophy/></span><div><strong>제{league.roundNumber}회 조&amp;애플 일요리그</strong><small>{orderedIds.length}명 참가</small></div></div>{editing&&<p className="schedule-edit-warning"><Info/>저장하면 기존 대진표가 현재 그룹 구성으로 교체됩니다.</p>}<section className="bracket-summary-info"><h3>그룹 정보</h3><p><i><Users/></i><span>전체 참가자</span><b>{orderedIds.length}명</b></p><p><i><Layers3/></i><span>생성 그룹</span><b>{groups.length}개</b></p><p><i><Target/></i><span>그룹당 기준</span><b>{groupSize}명</b></p><p><i><Gamepad2/></i><span>예선 경기</span><b>{totalMatches}경기</b></p><p><i><GitBranch/></i><span>진행 방식</span><b>{league.stageMode==="PRELIMINARY_FINAL"?"예선 + 본선":"단일 리그"}</b></p>{league.stageMode==="PRELIMINARY_FINAL"&&<p><i><Medal/></i><span>상위부 진출</span><b>각 조 인원의 절반</b></p>}{league.stageMode==="PRELIMINARY_FINAL"&&hasOddGroup&&<small className="bracket-summary-note"><Info/>홀수 조는 하위부가 1명 더 많습니다.</small>}</section>{error&&<p className="schedule-create-error" role="alert">{error}</p>}<button disabled={isPending}>{isPending?"대진 생성 중...":editing?"대진표 다시 생성":league.stageMode==="PRELIMINARY_FINAL"?"예선 대진 생성":"그룹별 대진 생성"}<ChevronRight /></button></aside>
    </form>
  </div>;
}

export function movePlayerStep(ids: string[], index: number, direction: number) {
  const target = index + direction;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids]; [next[index], next[target]] = [next[target], next[index]];
  return next;
}
