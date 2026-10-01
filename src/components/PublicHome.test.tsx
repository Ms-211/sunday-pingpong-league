import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/data", () => ({
  getPublicHomeLeagues: async () => []
}));
vi.mock("@/lib/statistics-data", () => ({
  selectedSeason: (seasons: unknown[]) => seasons[0],
  getStatisticsData: async () => ({
    people: new Map([["player-1", { id: "player-1", name: "샘플선수010", division: "7" }]]),
    seasons: [{ id: "season-1", name: "2026 3분기", start_date: "2026-07-01", end_date: "2026-09-30", finalized_at: null, revision: 1, finalized_revision: null }],
    leagues: [{ id: "league-1", season_id: "season-1", league_date: "2026-09-01", round_number: 1, status: "COMPLETED", bracket_generated: true, league_participants: [{ player_id: "player-1", name_snapshot: "샘플선수010", division_snapshot: "7" }], matches: [], league_standings: [{ player_id: "player-1", rank: 1 }] }],
    awards: []
  })
}));

import Home from "@/app/page";

it("shows public player lookup and finalized season titles", async () => {
  const html = renderToStaticMarkup(await Home({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("내 기록 찾기");
  expect(html).toContain("선수 이름을 검색하세요");
  expect(html).toContain("공식 시즌 타이틀");
  expect(html).toContain("PLAYER SEARCH");
  expect(html).toContain("CHAMPION");
  expect(html).toContain("ATTENDANCE");
  expect(html).toContain("MOST WINS");
  expect(html).toContain("현재 선두 기록이며 시즌 종료 후 확정됩니다.");
  expect(html).toContain('class="home-title-leaders"');
  expect(html).toContain(">1<small>위</small>");
  expect(html).toContain("샘플선수010");
  expect(html).toContain('href="/statistics?season=season-1"');
});
