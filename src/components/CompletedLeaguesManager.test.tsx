import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CompletedLeaguesManager } from "./CompletedLeaguesManager";

it("links each league name to its management page", () => {
  const html=renderToStaticMarkup(<CompletedLeaguesManager leagues={[{id:"league-47",round:47,date:"2026-09-13",status:"COMPLETED",completionType:"NORMAL",participants:17,matches:64,winners:["샘플선수015"]}]}/>);
  expect(html).toContain('class="league-detail-link" href="/admin/leagues/league-47"');
});
