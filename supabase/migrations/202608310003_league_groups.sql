alter table public.leagues
  add column if not exists group_size integer;

alter table public.league_participants
  add column if not exists group_no integer not null default 1;

alter table public.matches
  add column if not exists group_no integer not null default 1;

alter table public.tournament_advances
  add column if not exists group_no integer not null default 1;

alter table public.leagues drop constraint if exists leagues_group_size_check;
alter table public.leagues add constraint leagues_group_size_check
  check (group_size is null or group_size >= 2);

alter table public.league_participants drop constraint if exists league_participants_group_no_check;
alter table public.league_participants add constraint league_participants_group_no_check check (group_no > 0);
alter table public.matches drop constraint if exists matches_group_no_check;
alter table public.matches add constraint matches_group_no_check check (group_no > 0);
alter table public.tournament_advances drop constraint if exists tournament_advances_group_no_check;
alter table public.tournament_advances add constraint tournament_advances_group_no_check check (group_no > 0);
