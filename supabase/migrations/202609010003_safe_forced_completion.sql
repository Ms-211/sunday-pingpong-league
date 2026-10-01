alter table public.match_result_history
  drop constraint if exists match_result_history_match_id_fkey;

alter table public.match_result_history
  add constraint match_result_history_match_id_fkey
  foreign key (match_id) references public.matches(id) on delete cascade;

alter table public.leagues
  add column if not exists completion_type text not null default 'NORMAL';

alter table public.leagues
  drop constraint if exists leagues_completion_type_check;

alter table public.leagues
  add constraint leagues_completion_type_check
  check (completion_type in ('NORMAL', 'FORCED'));

create or replace function public.force_complete_league(
  p_league_id uuid,
  p_standings jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  update public.leagues
  set status = 'COMPLETED',
      completed_at = now(),
      completion_type = 'FORCED',
      updated_at = now()
  where id = p_league_id
    and status = 'IN_PROGRESS';

  if not found then
    raise exception '진행 중인 리그만 강제 완료할 수 있습니다.';
  end if;

  delete from public.league_standings
  where league_id = p_league_id;

  insert into public.league_standings (
    league_id,
    player_id,
    rank,
    matches_played,
    wins,
    losses,
    sets_won,
    sets_lost,
    set_difference,
    tie_break_data
  )
  select
    p_league_id,
    row.player_id,
    row.rank,
    row.matches_played,
    row.wins,
    row.losses,
    row.sets_won,
    row.sets_lost,
    row.set_difference,
    coalesce(row.tie_break_data, '{}'::jsonb)
  from jsonb_to_recordset(coalesce(p_standings, '[]'::jsonb)) as row(
    player_id uuid,
    rank integer,
    matches_played integer,
    wins integer,
    losses integer,
    sets_won integer,
    sets_lost integer,
    set_difference integer,
    tie_break_data jsonb
  );
end;
$$;

revoke all on function public.force_complete_league(uuid, jsonb) from public;
grant execute on function public.force_complete_league(uuid, jsonb) to authenticated;
