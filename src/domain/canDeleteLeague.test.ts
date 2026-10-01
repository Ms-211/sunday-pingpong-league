import { describe, expect, it } from "vitest";
import { canDeleteLeague, leagueDeletePhrase } from "./canDeleteLeague";

describe("canDeleteLeague", () => {
  it("requires the exact round phrase for an editable league", () => {
    expect(leagueDeletePhrase(47)).toBe("47회 삭제");
    expect(canDeleteLeague("IN_PROGRESS", 47, "47회 삭제")).toBe(true);
    expect(canDeleteLeague("IN_PROGRESS", 47, "삭제")).toBe(false);
  });

  it("never deletes a completed league", () => {
    expect(canDeleteLeague("COMPLETED", 47, "47회 삭제")).toBe(false);
  });
});
