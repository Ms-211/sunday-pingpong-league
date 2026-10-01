export type LeagueFormat = "ROUND_ROBIN" | "SINGLE_ELIMINATION";
export type MatchRule = "BO3" | "BO5";
export type ResultType = "NORMAL" | "FORFEIT";

export interface Participant {
  id: string;
  playerId: string;
  name: string;
  division: string | null;
  schedulePosition: number;
  groupNo?: number;
}

export interface Match {
  id: string;
  playerAId: string;
  playerBId: string;
  roundNo: number;
  roundMatchNo: number;
  matchRule?: MatchRule;
  groupNo?: number;
}

export interface MatchResult {
  matchId: string;
  playerASets: number;
  playerBSets: number;
  resultType?: ResultType;
}

export interface Standing {
  playerId: string;
  name: string;
  division: string | null;
  rank: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setDifference: number;
}
