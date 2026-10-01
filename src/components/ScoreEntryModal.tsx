"use client";
import { Check, Minus, Plus, X } from "lucide-react";
import { useState } from "react";
import { saveResult } from "@/app/actions";
import type { MatchRule } from "@/types/domain";
type Props = { matchId: string; leagueId: string; round: number; playerA: string; playerB: string; initialA?: number; initialB?: number; matchRule?: MatchRule; finalizedSeason?: boolean; initialType?: "NORMAL" | "FORFEIT"; onClose: () => void };
export function ScoreEntryModal({ matchId, leagueId, round, playerA, playerB, initialA = 0, initialB = 0, matchRule = "BO3", finalizedSeason = false, initialType = "NORMAL", onClose }: Props) {
  const [scoreA,setScoreA] = useState(initialA), [scoreB,setScoreB] = useState(initialB);
  const [type,setType] = useState(initialType), [winner,setWinner] = useState(initialA > initialB ? "a" : "b");
  const [ack,setAck] = useState(false), [saving,setSaving] = useState(false), [error,setError] = useState("");
  const valid = (type === "FORFEIT" || scoreA !== scoreB) && (!finalizedSeason || ack);
  return <div className="score-modal-backdrop" onMouseDown={e => !saving && e.currentTarget === e.target && onClose()}><section className="score-modal direct-score-modal" role="dialog" aria-modal="true" aria-labelledby="score-title">
    <button className="score-close" aria-label="닫기" onClick={onClose} disabled={saving}><X/></button><span>{round}라운드</span><h2 id="score-title">경기 결과 입력</h2>
    {finalizedSeason && <div className="season-warning"><p>종료된 시즌의 경기입니다. 이 경기 결과를 수정하면 과거 시즌 통계가 변경될 수 있습니다. 공식 시즌 칭호는 자동으로 변경되지 않습니다.</p><label><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/> 경고를 확인했습니다.</label></div>}
    <label className="score-result-type">결과 종류 <select value={type} onChange={e => setType(e.target.value as "NORMAL" | "FORFEIT")}><option value="NORMAL">정상 경기</option><option value="FORFEIT">몰수 경기</option></select></label>
    {type === "FORFEIT" ? <div><label>몰수승 선수 <select value={winner} onChange={e => setWinner(e.target.value)}><option value="a">{playerA}</option><option value="b">{playerB}</option></select></label><p>몰수 경기는 세트 점수를 저장하지 않습니다.</p></div> : <><p className="score-help">기본 승리 기준 {matchRule === "BO5" ? 3 : 2}세트 · 입력한 세트 수가 높은 선수가 승리합니다.</p><div className="score-counter-list">{[{name:playerA,score:scoreA,set:setScoreA},{name:playerB,score:scoreB,set:setScoreB}].map((p,i) => <div key={i}><strong>{p.name}</strong><div><button type="button" aria-label={`${p.name} 점수 감소`} disabled={p.score === 0} onClick={() => p.set(s => Math.max(0,s-1))}><Minus/></button><b>{p.score}</b><button type="button" aria-label={`${p.name} 점수 증가`} disabled={p.score === 3} onClick={() => p.set(s => Math.min(3,s+1))}><Plus/></button></div></div>)}</div></>}
    <div className="score-modal-actions"><button type="button" onClick={onClose} disabled={saving}><X/> 취소</button><form action={async () => { setSaving(true); setError(""); try { await saveResult(matchId,leagueId,type === "FORFEIT" ? Number(winner === "a") : scoreA,type === "FORFEIT" ? Number(winner === "b") : scoreB,type,ack); onClose(); } catch(e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); } finally { setSaving(false); } }}><button disabled={!valid || saving}><Check/>{saving ? "저장 중" : "확인"}</button></form></div>{error && <p role="alert">{error}</p>}
  </section></div>;
}
