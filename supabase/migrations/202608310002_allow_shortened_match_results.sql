-- A match may be shortened while it is in progress. The higher set score wins.
alter table public.match_results
  drop constraint if exists match_results_score_check;

alter table public.match_results
  add constraint match_results_score_check check (
    player_a_sets between 0 and 3
    and player_b_sets between 0 and 3
    and player_a_sets <> player_b_sets
    and (player_a_sets > 0 or player_b_sets > 0)
  );
