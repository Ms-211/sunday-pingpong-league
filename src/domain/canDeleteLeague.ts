export type DeletableLeagueStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED";

export const leagueDeletePhrase = (round: number) => `${round}회 삭제`;

export function canDeleteLeague(status: DeletableLeagueStatus, round: number, confirmation: string) {
  return status !== "COMPLETED" && confirmation === leagueDeletePhrase(round);
}
