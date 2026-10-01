create or replace function public.rebuild_league_schedule(
  p_league_id uuid,
  p_group_size integer,
  p_participants jsonb,
  p_matches jsonb,
  p_byes jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  league public.leagues;
  participant_count integer;
begin
  if not public.is_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  select * into strict league from public.leagues where id = p_league_id for update;
  if league.status <> 'IN_PROGRESS' then
    raise exception '진행 중인 리그만 대진표를 수정할 수 있습니다.';
  end if;
  if league.finals_generated then
    raise exception '본선 대진이 생성된 리그는 수정할 수 없습니다.';
  end if;
  if exists (
    select 1 from public.match_results r
    join public.matches m on m.id = r.match_id
    where m.league_id = p_league_id
  ) then
    raise exception '경기 결과가 입력된 리그는 대진표를 수정할 수 없습니다.';
  end if;
  if p_group_size < 2 or jsonb_typeof(p_participants) <> 'array' then
    raise exception '참가자 구성이 올바르지 않습니다.';
  end if;

  select count(*) into participant_count from public.league_participants where league_id = p_league_id;
  if participant_count <> jsonb_array_length(p_participants)
    or participant_count <> (select count(distinct (row->>'player_id')::uuid) from jsonb_array_elements(p_participants) row)
    or exists (
      select 1 from public.league_participants participant
      where participant.league_id = p_league_id
        and not exists (
          select 1 from jsonb_array_elements(p_participants) row
          where (row->>'player_id')::uuid = participant.player_id
        )
    ) then
    raise exception '기존 참가자 구성과 일치하지 않습니다.';
  end if;

  update public.league_participants set schedule_position = schedule_position + 100000 where league_id = p_league_id;
  update public.league_participants participant
  set schedule_position = row.schedule_position, group_no = row.group_no
  from jsonb_to_recordset(p_participants) as row(player_id uuid, schedule_position integer, group_no integer)
  where participant.league_id = p_league_id and participant.player_id = row.player_id;

  delete from public.tournament_advances where league_id = p_league_id;
  delete from public.matches where league_id = p_league_id;

  insert into public.matches(league_id, player_a_id, player_b_id, round_no, round_match_no, match_rule, group_no, stage)
  select p_league_id, row.player_a_id, row.player_b_id, row.round_no, row.round_match_no, row.match_rule, row.group_no, row.stage
  from jsonb_to_recordset(coalesce(p_matches, '[]'::jsonb)) as row(
    player_a_id uuid, player_b_id uuid, round_no integer, round_match_no integer,
    match_rule text, group_no integer, stage text
  );

  insert into public.tournament_advances(league_id, round_no, player_id, group_no)
  select p_league_id, row.round_no, row.player_id, row.group_no
  from jsonb_to_recordset(coalesce(p_byes, '[]'::jsonb)) as row(round_no integer, player_id uuid, group_no integer);

  update public.leagues
  set group_size = p_group_size, bracket_generated = true, finals_generated = false, updated_at = now()
  where id = p_league_id;
end;
$$;

revoke all on function public.rebuild_league_schedule(uuid, integer, jsonb, jsonb, jsonb) from public;
grant execute on function public.rebuild_league_schedule(uuid, integer, jsonb, jsonb, jsonb) to authenticated;
