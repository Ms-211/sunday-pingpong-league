import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { StatsLeague } from "@/lib/statistics";

const fixture = vi.hoisted(() => ({
  season: { id:"s",name:"2026 3분기",start_date:"2026-07-01",end_date:"2099-09-30",finalized_at:null,revision:0,finalized_revision:null },
  leagues: [] as StatsLeague[]
}));
vi.mock("@/lib/statistics-data", () => ({
  getStatisticsData: async () => ({ seasons:[fixture.season],awards:[],leagues:fixture.leagues,people:new Map([["player",{id:"player",name:"샘플선수010",division:"7"}]]) }),
  selectedSeason: () => fixture.season
}));
vi.mock("@/app/season-actions", () => ({ finalizeSeason:async()=>{} }));
vi.mock("@/app/actions", () => ({ logout:async()=>{} }));
vi.mock("next/navigation", () => ({ usePathname:()=>"/admin/seasons",notFound:()=>{throw new Error("not found");} }));
import AdminSeasonPage from "@/app/admin/seasons/page";
import PlayerPage from "@/app/players/[playerId]/page";
import AdminPlayerPage from "@/app/admin/players/[playerId]/page";
import { AdminSidebar } from "./AdminSidebar";

it("keeps finalization disabled until the season ends without manual season settings", async () => {
  const element=await AdminSeasonPage({searchParams:Promise.resolve({})});
  const html=renderToStaticMarkup(element);
  expect(html).toMatch(/<button disabled="">[\s\S]*?시즌 결과 확정/);
  expect(html).toContain("확정 체크리스트");
  expect(html).not.toContain("시즌 기간·이름 수정");
  expect(html).not.toContain("리그 시즌 예외 변경");
  expect(html).toContain('href="/admin/statistics?season=s"');
  if(process.env.STATISTICS_PREVIEW){
    mkdirSync(".next",{recursive:true});
    const body=renderToStaticMarkup(<div className="admin-shell"><AdminSidebar email="관리자"/><main className="admin-main">{element}</main></div>);
    writeFileSync(".next/admin-season-preview.html",`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${readFileSync("src/app/globals.css","utf8")}</style><body>${body}</body></html>`);
  }
});
it("opens a player with no league history in both season and career views", async () => {
  for(const season of [undefined,"career"]){
    const html=renderToStaticMarkup(await PlayerPage({params:Promise.resolve({playerId:"player"}),searchParams:Promise.resolve({season})}));
    expect(html).toContain("샘플선수010");
    expect(html).toContain("완료된 리그 참가 기록이 없습니다.");
    expect(html).toContain(season ? "통산 기본 기록" : "2026 3분기 기본 기록");
    expect(html).toContain('aria-label="선수 기록 범위"');
    if (!season) expect(html).toContain("나를 가장 많이 이긴 상대");
    expect(html).toContain('href="/"');
    expect(html).toContain("메인 화면으로");
    expect(html).toContain('href="/players/player?season=career"');
  }
});
it("keeps admin player navigation inside the admin shell", async () => {
  const html=renderToStaticMarkup(await AdminPlayerPage({params:Promise.resolve({playerId:"player"}),searchParams:Promise.resolve({})}));
  expect(html).toContain('href="/admin/statistics"');
  expect(html).toContain('href="/admin/players/player?season=career"');
});
it("shows six league history cards without URL pagination", async () => {
  fixture.leagues=Array.from({length:7},(_,index)=>({id:`league-${index+1}`,season_id:"s",league_date:`2026-09-${String(index+1).padStart(2,"0")}`,round_number:index+1,status:"COMPLETED",bracket_generated:true,league_participants:[{player_id:"player",name_snapshot:"샘플선수010",division_snapshot:"7"}],matches:[],league_standings:[{player_id:"player",rank:index+1}]}));
  try {
    const html=renderToStaticMarkup(await PlayerPage({params:Promise.resolve({playerId:"player"}),searchParams:Promise.resolve({})}));
    expect((html.match(/class="profile-history-row"/g)??[])).toHaveLength(6);
    expect(html).toContain("1 / 2");
    expect(html).not.toContain("?page=");
  } finally { fixture.leagues=[]; }
});
