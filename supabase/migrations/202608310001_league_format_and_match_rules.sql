alter table public.leagues
  add column if not exists format text not null default 'ROUND_ROBIN',
  add column if not exists default_match_rule text not null default 'BO3',
  add column if not exists bracket_generated boolean not null default false;

alter table public.leagues drop constraint if exists leagues_format_check;
alter table public.leagues add constraint leagues_format_check
  check (format in ('ROUND_ROBIN','SINGLE_ELIMINATION'));
alter table public.leagues drop constraint if exists leagues_default_match_rule_check;
alter table public.leagues add constraint leagues_default_match_rule_check
  check (default_match_rule in ('BO3','BO5'));

alter table public.matches
  add column if not exists match_rule text not null default 'BO3';
alter table public.matches drop constraint if exists matches_match_rule_check;
alter table public.matches add constraint matches_match_rule_check
  check (match_rule in ('BO3','BO5'));

alter table public.match_results drop constraint if exists match_results_check;
alter table public.match_results drop constraint if exists match_results_score_check;
alter table public.match_results add constraint match_results_score_check check (
  (player_a_sets, player_b_sets) in
  ((2,0),(2,1),(1,2),(0,2),(3,0),(3,1),(3,2),(2,3),(1,3),(0,3))
);

create table if not exists public.tournament_advances (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  round_no integer not null check (round_no > 0),
  player_id uuid not null references public.players(id),
  created_at timestamptz not null default now(),
  unique (league_id, round_no, player_id)
);

alter table public.tournament_advances enable row level security;
drop policy if exists "public read published tournament advances" on public.tournament_advances;
create policy "public read published tournament advances" on public.tournament_advances
  for select using (
    exists(select 1 from public.leagues l where l.id=league_id and (l.status in ('IN_PROGRESS','COMPLETED') or public.is_admin()))
  );
drop policy if exists "admins manage tournament advances" on public.tournament_advances;
create policy "admins manage tournament advances" on public.tournament_advances
  for all using(public.is_admin()) with check(public.is_admin());

update public.leagues set
  format = coalesce(format, 'ROUND_ROBIN'),
  default_match_rule = case when best_of_sets = 5 then 'BO5' else 'BO3' end;
update public.matches m set match_rule = l.default_match_rule
from public.leagues l where l.id = m.league_id;
