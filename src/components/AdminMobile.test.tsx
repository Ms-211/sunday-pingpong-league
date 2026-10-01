import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));
vi.mock("@/app/actions", () => ({
  logout: async () => {},
  createScheduleFromParticipants: async () => {},
  rebuildScheduleFromParticipants: async () => {},
}));

import { AdminSidebar } from "./AdminSidebar";
import { movePlayerStep, ParticipantsManager } from "./ParticipantsManager";

it("provides a collapsible admin menu and touch-friendly player order controls", () => {
  const sidebar = renderToStaticMarkup(<AdminSidebar email="admin@example.com" />);
  expect(sidebar).toContain('aria-label="메뉴 열기"');
  expect(sidebar).toContain('aria-expanded="false"');
  expect(sidebar).toContain('aria-controls="admin-sidebar-body"');
  expect(sidebar).toContain('href="/"');
  expect(sidebar).toContain('aria-label="로그아웃"');

  const players = [
    { id: "a", name: "선수 A", division: "7" },
    { id: "b", name: "선수 B", division: "7" },
  ];
  const league = { id: "league", roundNumber: 1, format: "ROUND_ROBIN" as const, defaultRule: "BO3" as const, stageMode: "SINGLE" as const, status: "DRAFT" as const };
  const page = renderToStaticMarkup(<ParticipantsManager league={league} players={players} initialIds={["a", "b"]} initialGroupSize={2} />);
  expect(page).toContain('aria-label="선수 A 아래로 이동"');
  expect(page).toContain('aria-label="선수 B 위로 이동"');
  expect(page).toMatch(/aria-label="선수 A 위로 이동" disabled=""/);
  expect(movePlayerStep(["a", "b"], 0, 1)).toEqual(["b", "a"]);
  expect(movePlayerStep(["a", "b"], 0, -1)).toEqual(["a", "b"]);
});
