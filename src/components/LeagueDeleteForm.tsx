"use client";

import { useState } from "react";
import { deleteEditableLeague } from "@/app/actions";
import { leagueDeletePhrase } from "@/domain/canDeleteLeague";

export function LeagueDeleteForm({ id, round, status }: { id: string; round: number; status: "DRAFT" | "IN_PROGRESS" }) {
  const [confirmation,setConfirmation]=useState("");
  const phrase=leagueDeletePhrase(round);
  return <form action={deleteEditableLeague.bind(null,id)}>
    <label htmlFor="league-delete-confirmation"><strong>{phrase}</strong>를 입력해 주세요.</label>
    <div><input id="league-delete-confirmation" name="confirmation" value={confirmation} onChange={event=>setConfirmation(event.target.value)} placeholder={phrase} autoComplete="off"/><button disabled={confirmation!==phrase}>리그 삭제</button></div>
    <small>{status==="IN_PROGRESS"?"참가자, 대진표, 입력된 경기 결과가 모두 삭제되며 복구할 수 없습니다.":"저장된 리그 설정과 참가자 정보가 삭제되며 복구할 수 없습니다."}</small>
  </form>;
}
