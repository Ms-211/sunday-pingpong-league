export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert, Update, Relationships extends Relationship[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

type PlayerRow = {
  id: string;
  name: string;
  affiliation: string | null;
  division: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type LeagueRow = {
  season_id: string;
  id: string;
  round_number: number;
  league_date: string;
  status: Database["public"]["Enums"]["league_status"];
  best_of_sets: number;
  format: "ROUND_ROBIN" | "SINGLE_ELIMINATION";
  default_match_rule: "BO3" | "BO5";
  bracket_generated: boolean;
  group_size: number | null;
  stage_mode: "SINGLE" | "PRELIMINARY_FINAL";
  advance_per_group: number | null;
  finals_generated: boolean;
  completion_type: "NORMAL" | "FORCED";
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type LeagueParticipantRow = {
  id: string;
  league_id: string;
  player_id: string;
  name_snapshot: string;
  division_snapshot: string | null;
  schedule_position: number;
  group_no: number;
  created_at: string;
};

type MatchRow = {
  id: string;
  league_id: string;
  player_a_id: string;
  player_b_id: string;
  round_no: number;
  round_match_no: number;
  match_rule: "BO3" | "BO5";
  group_no: number;
  stage: "PRELIMINARY" | "FINAL";
  created_at: string;
  updated_at: string;
};

type MatchResultRow = {
  winner_id: string | null;
  id: string;
  match_id: string;
  player_a_sets: number;
  player_b_sets: number;
  result_type: Database["public"]["Enums"]["result_type"];
  created_by: string;
  created_at: string;
  updated_at: string;
};

type MatchResultHistoryRow = {
  id: string;
  match_id: string;
  old_result: Json;
  new_result: Json;
  changed_by: string;
  changed_at: string;
};

type LeagueStandingRow = {
  id: string;
  league_id: string;
  player_id: string;
  rank: number;
  matches_played: number;
  wins: number;
  losses: number;
  sets_won: number;
  sets_lost: number;
  set_difference: number;
  tie_break_data: Json;
  calculated_at: string;
};

type TournamentAdvanceRow = {
  id: string;
  league_id: string;
  round_no: number;
  player_id: string;
  group_no: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      seasons: Table<
        { id: string; name: string; start_date: string; end_date: string; finalized_at: string | null; revision: number; finalized_revision: number | null },
        { id?: string; name: string; start_date: string; end_date: string },
        { name?: string; start_date?: string; end_date?: string }
      >;
      season_awards: Table<
        { id: string; season_id: string; award_type: "CHAMPION" | "ATTENDANCE_KING" | "WIN_KING"; player_id: string; value: number; finalized_at: string },
        { season_id: string; award_type: "CHAMPION" | "ATTENDANCE_KING" | "WIN_KING"; player_id: string; value: number; finalized_at: string },
        { value?: number }
      >;
      admin_users: Table<
        {
          user_id: string;
          display_name: string;
          role: Database["public"]["Enums"]["admin_role"];
          created_at: string;
        },
        {
          user_id: string;
          display_name: string;
          role?: Database["public"]["Enums"]["admin_role"];
          created_at?: string;
        },
        {
          user_id?: string;
          display_name?: string;
          role?: Database["public"]["Enums"]["admin_role"];
          created_at?: string;
        }
      >;
      players: Table<
        PlayerRow,
        {
          id?: string;
          name: string;
          affiliation?: string | null;
          division?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        Partial<PlayerRow>
      >;
      leagues: Table<
        LeagueRow,
        {
          id?: string;
          round_number: number;
          season_id?: string;
          league_date: string;
          status?: Database["public"]["Enums"]["league_status"];
          best_of_sets?: number;
          format?: "ROUND_ROBIN" | "SINGLE_ELIMINATION";
          default_match_rule?: "BO3" | "BO5";
          bracket_generated?: boolean;
          group_size?: number | null;
          stage_mode?: "SINGLE" | "PRELIMINARY_FINAL";
          advance_per_group?: number | null;
          finals_generated?: boolean;
          completion_type?: "NORMAL" | "FORCED";
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        },
        Partial<LeagueRow>
      >;
      league_participants: Table<
        LeagueParticipantRow,
        {
          id?: string;
          league_id: string;
          player_id: string;
          name_snapshot: string;
          division_snapshot?: string | null;
          schedule_position: number;
          group_no?: number;
          created_at?: string;
        },
        Partial<LeagueParticipantRow>,
        [
          {
            foreignKeyName: "league_participants_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "league_participants_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ]
      >;
      matches: Table<
        MatchRow,
        {
          id?: string;
          league_id: string;
          player_a_id: string;
          player_b_id: string;
          round_no: number;
          round_match_no: number;
          match_rule?: "BO3" | "BO5";
          group_no?: number;
          stage?: "PRELIMINARY" | "FINAL";
          created_at?: string;
          updated_at?: string;
        },
        Partial<MatchRow>,
        [
          {
            foreignKeyName: "matches_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_player_a_id_fkey";
            columns: ["player_a_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_player_b_id_fkey";
            columns: ["player_b_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ]
      >;
      match_results: Table<
        MatchResultRow,
        {
          winner_id?: string | null;
          id?: string;
          match_id: string;
          player_a_sets: number;
          player_b_sets: number;
          result_type?: Database["public"]["Enums"]["result_type"];
          created_by: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<MatchResultRow>,
        [
          {
            foreignKeyName: "match_results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          }
        ]
      >;
      match_result_history: Table<
        MatchResultHistoryRow,
        {
          id?: string;
          match_id: string;
          old_result: Json;
          new_result: Json;
          changed_by: string;
          changed_at?: string;
        },
        Partial<MatchResultHistoryRow>,
        [
          {
            foreignKeyName: "match_result_history_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          }
        ]
      >;
      league_standings: Table<
        LeagueStandingRow,
        {
          id?: string;
          league_id: string;
          player_id: string;
          rank: number;
          matches_played: number;
          wins: number;
          losses: number;
          sets_won: number;
          sets_lost: number;
          set_difference: number;
          tie_break_data?: Json;
          calculated_at?: string;
        },
        Partial<LeagueStandingRow>,
        [
          {
            foreignKeyName: "league_standings_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "league_standings_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ]
      >;
      tournament_advances: Table<
        TournamentAdvanceRow,
        {
          id?: string;
          league_id: string;
          round_no: number;
          player_id: string;
          group_no?: number;
          created_at?: string;
        },
        Partial<TournamentAdvanceRow>,
        [
          {
            foreignKeyName: "tournament_advances_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_advances_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ]
      >;
    };
    Views: Record<string, never>;
    Functions: {
      ensure_calendar_seasons: { Args: Record<string, never>; Returns: undefined };
      finalize_season: { Args: { p_season_id: string; p_revision: number }; Returns: undefined };
      save_reviewed_result: { Args: { p_match_id: string; p_revision: number; p_a: number; p_b: number; p_type: "NORMAL" | "FORFEIT"; p_acknowledged: boolean; p_standings: Json }; Returns: undefined };
      force_complete_league: {
        Args: { p_league_id: string; p_standings: Json };
        Returns: undefined;
      };
      rebuild_league_schedule: {
        Args: { p_league_id: string; p_group_size: number; p_participants: Json; p_matches: Json; p_byes: Json };
        Returns: undefined;
      };
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      admin_role: "ADMIN" | "OPERATOR";
      league_status: "DRAFT" | "IN_PROGRESS" | "COMPLETED";
      result_type: "NORMAL" | "FORFEIT";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type MatchInsert = Database["public"]["Tables"]["matches"]["Insert"];
export type TournamentAdvanceInsert = Database["public"]["Tables"]["tournament_advances"]["Insert"];
