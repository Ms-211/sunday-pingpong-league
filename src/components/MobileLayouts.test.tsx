import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { OpsBoard, mobileMatches } from "./OpsBoard";
import { SeasonStatistics, type StatisticsData } from "./StatisticsView";
import { PlayerRecordsPanel } from "./PlayerRecordsTable";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));

const participants = ["김민수", "박지영", "아주긴이름의탁구선수김하늘", "이서준", "최유진", "정도윤", "강수빈", "윤지호"].map((name, i) => ({
  id: `p${i}`, player_id: `p${i}`, name_snapshot: name, division_snapshot: "7", schedule_position: i + 1, group_no: i < 4 ? 1 : 2,
}));
const league = {
  id: "preview", round_number: 12, league_date: "2026-09-20", status: "IN_PROGRESS",
  league_participants: participants,
  matches: [1, 2].flatMap(group => [1, 2, 3].flatMap(round => [0, 1].map(index => ({
    id: `${group}-${round}-${index}`, group_no: group, round_no: round, round_match_no: index + 1,
    player_a_id: `p${(group - 1) * 4 + index}`, player_b_id: `p${(group - 1) * 4 + 2 + index}`,
    stage: "PRELIMINARY" as const, match_rule: "BO3" as const,
    match_results: round === 1 ? { player_a_sets: 2, player_b_sets: 0, result_type: index ? "FORFEIT" as const : "NORMAL" as const } : null,
  })))),
};
const season = { id: "s", name: "2026 3분기", start_date: "2026-07-01", end_date: "2026-09-30", finalized_at: null, revision: 0, finalized_revision: null };
const stats = {
  seasons: [season], awards: [],
  people: new Map(participants.map(p => [p.player_id, { id: p.player_id, name: p.name_snapshot, division: p.division_snapshot }])),
  leagues: [{ ...league, status: "COMPLETED", season_id: "s", bracket_generated: true,
    league_standings: participants.map((p, i) => ({ player_id: p.player_id, rank: i + 1 })),
    matches: league.matches.map(m => ({ ...m, match_results: m.match_results ?? { player_a_sets: 1, player_b_sets: 2, result_type: "NORMAL" } })),
  }],
} as unknown as StatisticsData;

it("limits the mobile list to six matches without restricting later rounds", () => {
  const html = renderToStaticMarkup(<OpsBoard league={league}/>);
  const queue = html.split('aria-label="경기 찾기"')[1].split("<nav")[0];
  expect(queue.match(/<button/g)).toHaveLength(6);
  expect(queue).toContain("A조 · 2라운드");
  expect(queue).toContain("A조 · 3라운드");
  expect(queue).not.toContain("1라운드");
  expect(html).toContain("몰수승");
  expect(html).toContain('aria-label="경기 목록 페이지"');
  expect(html.indexOf('aria-label="경기 찾기"')).toBeLessThan(html.indexOf('aria-label="확대·축소 대진표"'));
  expect(html.indexOf('aria-label="확대·축소 대진표"')).toBeLessThan(html.indexOf('aria-controls="group-rankings"'));
  const complete = renderToStaticMarkup(<OpsBoard league={{ ...league, matches: [] }}/>);
  expect(complete).toContain("조건에 맞는 경기가 없습니다.");
  expect(mobileMatches(league.matches, participants, "박지영", "all", "pending").map(m => m.id)).toEqual(["1-2-1", "1-3-1"]);
  expect(mobileMatches(league.matches, participants, "", "2", "done").map(m => m.id)).toEqual(["2-1-0", "2-1-1"]);
  expect(mobileMatches(league.matches, participants, "없는 선수", "all", "all")).toEqual([]);
  expect(mobileMatches(league.matches, participants, "", "all", "all")).toHaveLength(12);
});

it("makes public match cards read-only while operators can enter results", () => {
  const publicHtml = renderToStaticMarkup(<OpsBoard league={league}/>);
  expect(publicHtml).not.toContain("결과 입력");
  expect(publicHtml).not.toContain("결과 수정");
  expect(publicHtml).toMatch(/aria-label="[^"]*경기 예정"[^>]*disabled=""/);
  const operatorHtml = renderToStaticMarkup(<OpsBoard league={league} readOnly={false}/>);
  expect(operatorHtml).toContain("결과 입력");
  expect(operatorHtml).toContain("결과 수정");
});

it("retains comparable mobile records and safe zero-game rates", () => {
  const html = renderToStaticMarkup(<SeasonStatistics data={stats} season={season}/>);
  expect(html).toContain('class="mobile-player-records"');
  expect(html).toContain("아주긴이름의탁구선수김하늘");
  expect(html).toContain("세부 기록");
  expect(html).toContain("외 6명 더 보기");
  expect(html).toContain('class="compact-records-toggle" aria-expanded="false"');
  const empty = renderToStaticMarkup(<PlayerRecordsPanel admin={false} initialPeriod="s" periods={[{ id: "s", name: "시즌", rows: [{ id: "p", name: "신규 선수", division: null, affiliation: null, games: 0, wins: 0, losses: 0, appearances: 0, setsWon: 0, setsLost: 0, championships: 0 }] }]}/>);
  expect(empty).not.toContain("NaN");
  expect(empty).toContain("0.0%");
  if (process.env.MOBILE_PREVIEW) {
    mkdirSync(".next/mobile-qa", { recursive: true });
    writeFileSync(".next/mobile-qa/fixtures.json", JSON.stringify({ league, season, stats: { ...stats, people: [...stats.people] } }));
  }
});
