import { expect, it } from "vitest";
import { canRebuildSchedule } from "./canRebuildSchedule";

it("allows rebuilding only before results or finals exist", () => {
  expect(canRebuildSchedule("IN_PROGRESS", 0, false)).toBe(true);
  expect(canRebuildSchedule("IN_PROGRESS", 1, false)).toBe(false);
  expect(canRebuildSchedule("IN_PROGRESS", 0, true)).toBe(false);
  expect(canRebuildSchedule("COMPLETED", 0, false)).toBe(false);
});
