type LeagueCompletion = {
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED";
  stageMode: "SINGLE" | "PRELIMINARY_FINAL";
  finalsGenerated: boolean;
  totalMatches: number;
  completedMatches: number;
};

export function canCompleteLeague({ status, stageMode, finalsGenerated, totalMatches, completedMatches }: LeagueCompletion) {
  return status === "IN_PROGRESS"
    && totalMatches > 0
    && completedMatches === totalMatches
    && (stageMode !== "PRELIMINARY_FINAL" || finalsGenerated);
}
