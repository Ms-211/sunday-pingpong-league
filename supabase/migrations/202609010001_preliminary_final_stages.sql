alter table public.leagues
  add column if not exists stage_mode text not null default 'SINGLE',
  add column if not exists advance_per_group integer,
  add column if not exists finals_generated boolean not null default false;

alter table public.matches
  add column if not exists stage text not null default 'PRELIMINARY';

alter table public.leagues drop constraint if exists leagues_stage_mode_check;
alter table public.leagues add constraint leagues_stage_mode_check
  check (stage_mode in ('SINGLE', 'PRELIMINARY_FINAL'));

alter table public.leagues drop constraint if exists leagues_advance_per_group_check;
alter table public.leagues add constraint leagues_advance_per_group_check
  check (advance_per_group is null or advance_per_group > 0);

alter table public.matches drop constraint if exists matches_stage_check;
alter table public.matches add constraint matches_stage_check
  check (stage in ('PRELIMINARY', 'FINAL'));

create index if not exists matches_league_stage_idx
  on public.matches(league_id, stage, group_no, round_no);

alter table public.matches
  drop constraint if exists matches_league_id_round_no_round_match_no_key;
drop index if exists public.matches_unique_pair;

create unique index if not exists matches_unique_stage_slot
  on public.matches(league_id, stage, group_no, round_no, round_match_no);
create unique index if not exists matches_unique_stage_pair
  on public.matches(league_id, stage, group_no, least(player_a_id,player_b_id), greatest(player_a_id,player_b_id));
