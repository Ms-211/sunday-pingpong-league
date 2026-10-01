"use client";

import { Settings2, X } from "lucide-react";
import { useState } from "react";
import { changeDefaultMatchRule } from "@/app/actions";
import type { MatchRule } from "@/types/domain";

export function MatchRuleChanger({ leagueId, current }: { leagueId: string; current: MatchRule }) {
  const [open, setOpen] = useState(false);
  const [rule, setRule] = useState<MatchRule>(current);
  return <>
    <button className="btn secondary" type="button" onClick={() => setOpen(true)}><Settings2 /> 경기 규칙 변경</button>
    {open && <div className="rule-modal-backdrop" onMouseDown={event => event.currentTarget === event.target && setOpen(false)}><section className="rule-modal" role="dialog" aria-modal="true"><button type="button" aria-label="닫기" onClick={() => setOpen(false)}><X /></button><h2>기본 경기 규칙 변경</h2><p>변경한 규칙은 미완료 경기에만 적용됩니다. 이미 완료된 경기 결과는 그대로 유지됩니다.</p><form action={changeDefaultMatchRule.bind(null, leagueId)} onSubmit={() => setOpen(false)}><label className={rule === "BO3" ? "selected" : ""}><input type="radio" name="rule" value="BO3" checked={rule === "BO3"} onChange={() => setRule("BO3")} /><strong>3판 2선승제</strong><span>먼저 2세트를 획득하면 승리</span></label><label className={rule === "BO5" ? "selected" : ""}><input type="radio" name="rule" value="BO5" checked={rule === "BO5"} onChange={() => setRule("BO5")} /><strong>5판 3선승제</strong><span>먼저 3세트를 획득하면 승리</span></label><div><button type="button" onClick={() => setOpen(false)}>취소</button><button>변경 적용</button></div></form></section></div>}
  </>;
}
