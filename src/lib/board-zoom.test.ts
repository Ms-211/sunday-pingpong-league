import { expect, test } from "vitest";
import { pinchScale } from "./board-zoom";

test("pinch scales continuously from the current zoom and stays within limits", () => {
  expect(pinchScale(1, 100, 137)).toBe(1.37);
  expect(pinchScale(1.5, 100, 50)).toBe(.75);
  expect(pinchScale(1, 100, 1)).toBe(.3);
  expect(pinchScale(1, 100, 1000)).toBe(3);
  expect(Number.isFinite(pinchScale(1, 0, 100))).toBe(true);
});
