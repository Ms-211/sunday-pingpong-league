export function canRebuildSchedule(status: "DRAFT" | "IN_PROGRESS" | "COMPLETED", completedMatches: number, finalsGenerated: boolean) {
  return status === "IN_PROGRESS" && completedMatches === 0 && !finalsGenerated;
}
