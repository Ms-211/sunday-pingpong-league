"use client";

import { CalendarDays } from "lucide-react";

export function SeasonSelect({ seasons, value, career }: { seasons: { id: string; name: string }[]; value?: string; career: boolean }) {
  return <form className="season-picker" method="get"><label><CalendarDays size={18}/><span className="sr-only">시즌</span><select aria-label="시즌 선택" name="season" value={value} onChange={event => event.currentTarget.form?.requestSubmit()}>
    {career && <option value="career">전체 통계</option>}{seasons.map(season => <option key={season.id} value={season.id}>{season.name}</option>)}
  </select></label></form>;
}
