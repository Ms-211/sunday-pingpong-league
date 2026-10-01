"use client";

import Link from "next/link";
import { CalendarDays, Check, ChevronRight, Info, Search, UserCheck, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createLeague, updateDraftLeague } from "@/app/actions";
import { formatDivision } from "@/lib/format";
import type { LeagueFormat, MatchRule } from "@/types/domain";

type Player = { id: string; name: string; division: string | null };
type DraftLeague = { id: string; round: number; date: string; format: LeagueFormat; defaultRule: MatchRule; stageMode: "SINGLE" | "PRELIMINARY_FINAL"; playerIds: string[] };

export function LeagueCreateManager({ nextRound, previous, players, draft = null }: { nextRound: number; previous: { round: number; date: string } | null; players: Player[]; draft?: DraftLeague | null }) {
  const [round, setRound] = useState(draft?.round ?? nextRound);
  const [date, setDate] = useState(draft?.date ?? new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState<LeagueFormat>(draft?.format ?? "ROUND_ROBIN");
  const [rule, setRule] = useState<MatchRule>(draft?.defaultRule ?? "BO3");
  const [stageMode, setStageMode] = useState(draft?.stageMode ?? "SINGLE");
  const [selected, setSelected] = useState<string[]>(draft?.playerIds ?? []);
  const [query, setQuery] = useState("");
  const visible = useMemo(() => players.filter(player => `${player.name} ${player.division ?? ""}`.toLowerCase().includes(query.toLowerCase())), [players, query]);
  const selectedPlayers = useMemo(() => selected.map(id => players.find(player => player.id === id)).filter((player): player is Player => Boolean(player)), [players, selected]);
  const toggle = (id: string) => setSelected(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
  const selectFromSearch = () => { const player = visible.find(item => !selected.includes(item.id)); if (player) { setSelected(ids => [...ids, player.id]); setQuery(""); } };

  return <div className="league-create-page admin-page">
    <header className="workflow-header admin-page-header"><div><h1>{draft?"리그 기본 정보 수정":"새 리그 생성"}</h1><p>홈 <ChevronRight /> 리그 관리 <ChevronRight /> {draft?`제${draft.round}회 수정`:"새 리그 생성"}</p></div><div><Link href={draft?`/admin/leagues/${draft.id}`:"/admin"}>취소</Link><button form="league-create-form" disabled={selected.length < 2}>다음 단계</button></div></header>
    <form id="league-create-form" action={draft ? updateDraftLeague.bind(null, draft.id) : createLeague} className="league-create-grid">
      {selected.map(id => <input key={id} type="hidden" name="playerIds" value={id} />)}
      <section className="league-info-panel">
        <h2><CalendarDays />리그 기본 정보</h2>
        <label><strong className="required-label">회차 <em>*</em></strong><span><input name="round_number" type="number" min="1" value={round} onChange={event => setRound(Number(event.target.value))} required /><b>회</b></span><small>{previous ? `이전 회차: ${previous.round}회 (${previous.date})` : "첫 번째 리그입니다."}</small></label>
        <label><strong className="required-label">일자 <em>*</em></strong><input name="league_date" type="date" value={date} onChange={event => setDate(event.target.value)} required /></label>
        <OptionCards compact title="경기 방식" name="format" value={format} onChange={value => setFormat(value as LeagueFormat)} options={[{ value: "ROUND_ROBIN", title: "풀리그", description: "" }, { value: "SINGLE_ELIMINATION", title: "토너먼트", description: "" }]} help="" />
        <OptionCards compact title="리그 구성" name="stage_mode" value={stageMode} onChange={value => setStageMode(value as "SINGLE" | "PRELIMINARY_FINAL")} options={[{ value: "SINGLE", title: "단일 리그", description: "" }, { value: "PRELIMINARY_FINAL", title: "예선 + 본선", description: "" }]} help="" />
        {stageMode === "PRELIMINARY_FINAL" && <p className="automatic-advance-note"><Info/>각 조 인원의 절반이 상위부로 진출합니다. 홀수인 경우 하위부가 1명 더 많습니다.</p>}
        <OptionCards title="기본 경기 규칙" name="default_match_rule" value={rule} onChange={value => setRule(value as MatchRule)} options={[{ value: "BO3", title: "3판 2선승", description: "최대 3세트" }, { value: "BO5", title: "5판 3선승", description: "최대 5세트" }]} help="리그 진행 중 변경할 수 있습니다." />
      </section>
      <section className="create-player-picker"><header><div><h2><Users /> 참가자 선택</h2><p>이번 리그에 참가할 선수를 선택하세요.</p></div><b>{selected.length}명 선택</b></header><label><Search /><input aria-label="참가자 검색" placeholder="이름 또는 부수로 검색" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); selectFromSearch(); } }} /></label><div>{visible.map(player => { const checked = selected.includes(player.id); return <button type="button" key={player.id} className={checked ? "selected" : ""} onClick={() => toggle(player.id)}><i>{checked && <Check />}</i><strong>{player.name}</strong><span>{formatDivision(player.division)}</span><em>{checked ? "선택됨" : "선택"}</em></button>; })}</div><footer><Info /> 참가자를 선택한 뒤 다음 화면에서 순서를 섞고 그룹을 나눌 수 있습니다.</footer></section>
      <section className="create-selected-players"><header><div><h2><UserCheck/> 선택한 선수</h2><p>이번 리그 참가 명단입니다.</p></div><b>{selected.length}명</b></header>{selectedPlayers.length?<div>{selectedPlayers.map((player,index)=><article key={player.id}><b>{index+1}</b><span><strong>{player.name}</strong><small>{formatDivision(player.division)}</small></span><button type="button" onClick={()=>toggle(player.id)} aria-label={`${player.name} 선택 해제`}><X/></button></article>)}</div>:<div className="selected-player-empty"><UserCheck/><strong>선택한 선수가 없습니다</strong><span>왼쪽 목록에서 선수를 선택하세요.</span></div>}<footer>최소 2명 이상 선택해 주세요.</footer></section>
    </form>
    <div className="workflow-steps"><span className="active"><b>1</b><strong>리그 정보·참가자<small>기본 정보 및 선수 선택</small></strong></span><i /><span><b>2</b><strong>순서 섞기<small>참가자 랜덤 배치</small></strong></span><i /><span><b>3</b><strong>그룹 구성<small>그룹당 인원 설정</small></strong></span><i /><span><b>4</b><strong>대진표 생성<small>그룹별 대진 저장</small></strong></span></div>
  </div>;
}

function OptionCards({ title, name, value, onChange, options, help, compact=false }: { title: string; name: string; value: string; onChange: (value: string) => void; options: { value: string; title: string; description: string }[]; help: string; compact?:boolean }) {
  return <fieldset className={`league-option-group ${compact?"compact":""}`}><legend>{title} <em>*</em></legend><div>{options.map(option => <label key={option.value} className={value === option.value ? "selected" : ""}><input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} /><i /><span><strong>{option.title}</strong>{option.description&&<small>{option.description}</small>}</span></label>)}</div>{help&&<p><Info />{help}</p>}</fieldset>;
}
