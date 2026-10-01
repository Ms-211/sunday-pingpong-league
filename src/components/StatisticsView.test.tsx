import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SeasonStatistics, type StatisticsData } from "./StatisticsView";
import { PlayerRecordRows, sortPlayerRecords } from "./PlayerRecordsTable";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const season = { id:"s",name:"2026 3분기",start_date:"2026-07-01",end_date:"2026-09-30",finalized_at:null,revision:0,finalized_revision:null };
const data: StatisticsData = { seasons:[season],awards:[],leagues:[],people:new Map() };
it("renders an empty season with a selector and all seven highlights", () => {
  const html=renderToStaticMarkup(<SeasonStatistics data={data} season={season}/>);
  expect(html).toContain("완료된 리그가 없습니다.");
  expect(html).toContain('aria-label="통계 기간"');
  for (const label of ["전승 우승","준우승 최다","풀세트 장인","깔끔한 승리","연속 우승","가장 많이 만난 두 선수","가장 팽팽한 상대"]) expect(html).toContain(label);
});
it("shows the unified period selector and requested player columns for admins", () => {
  const html=renderToStaticMarkup(<SeasonStatistics data={data} season={season} admin/>);
  expect(html).toContain("전체 통계");
  for(const option of ["이름 가나다순","소속순","우승자순"]) expect(html).toContain(option);
  for(const heading of ["선수","소속","참가","경기","승","패","승률","세트 승률","우승"]) expect(html).toContain(`<th${heading==="참가"?' class="optional-attendance"':""}>${heading}</th>`);
});
it("renders affiliation, match win rate, and set win rate", () => {
  const rows=[{id:"a",name:"샘플선수015",division:"5",affiliation:"조앤애플",appearances:5,games:42,wins:34,losses:8,setsWon:9,setsLost:3,championships:3},{id:"b",name:"샘플선수008",division:"7",affiliation:null,appearances:1,games:0,wins:0,losses:0,setsWon:0,setsLost:0,championships:0}];
  const html=renderToStaticMarkup(<table><tbody><PlayerRecordRows rows={rows} admin={false}/></tbody></table>);
  expect(html).not.toContain("5부"); expect(html).not.toContain("샘플선수015(5)");
  expect(html).toContain("81.0%"); expect(html).toContain("0.0%");
  expect(html).toContain("75.0%"); expect(html).toContain("조앤애플");
  expect(html).toContain('href="/players/a"'); expect(html).toContain(">-</td>");
});
it("sorts player records by name, affiliation, and championships", () => {
  const rows=[{id:"b",name:"박수",division:null,affiliation:"애플",appearances:1,games:2,wins:1,losses:1,setsWon:2,setsLost:2,championships:0},{id:"a",name:"김수",division:null,affiliation:"조앤애플",appearances:1,games:2,wins:2,losses:0,setsWon:4,setsLost:0,championships:2}];
  expect(sortPlayerRecords(rows,"name").map(row=>row.id)).toEqual(["a","b"]);
  expect(sortPlayerRecords(rows,"affiliation").map(row=>row.id)).toEqual(["b","a"]);
  expect(sortPlayerRecords(rows,"championships").map(row=>row.id)).toEqual(["a","b"]);
});
it("renders joint finalized awards with stable player links", () => {
  const finalized={...season,finalized_at:"2026-10-01"};
  const sample: StatisticsData={...data,people:new Map([["a",{id:"a",name:"샘플선수008",division:"7"}],["b",{id:"b",name:"샘플선수012",division:"6"}]]),awards:["a","b"].map(id=>({id,season_id:"s",player_id:id,award_type:"CHAMPION",value:4,finalized_at:"2026-10-01"}))};
  const html=renderToStaticMarkup(<SeasonStatistics data={sample} season={finalized}/>);
  expect(html).toContain('href="/players/a"'); expect(html).toContain('href="/players/b"');
  expect(html).toContain("2026 3분기 수상"); expect(html).not.toContain("현재 선두");
  // Optional standalone preview for tablet/mobile visual checks; never served by the app.
  if (process.env.STATISTICS_PREVIEW) {
    mkdirSync(".next",{recursive:true});
    writeFileSync(".next/season-preview.html",`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${readFileSync("src/app/globals.css","utf8")}</style><body><main class="container">${html}</main></body></html>`);
  }
});
