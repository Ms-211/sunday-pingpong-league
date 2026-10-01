-- Existing leagues, matches and final standings remain the source of truth.
alter table public.match_results add column winner_id uuid references public.players(id);
update public.match_results r set winner_id = case when r.player_a_sets > r.player_b_sets then m.player_a_id else m.player_b_id end from public.matches m where m.id=r.match_id and r.result_type='FORFEIT';
alter table public.match_results drop constraint match_results_score_check;
alter table public.match_results add constraint match_results_score_check check (
  (result_type='FORFEIT' and winner_id is not null and player_a_sets between 0 and 3 and player_b_sets between 0 and 3)
  or (result_type='NORMAL' and winner_id is null and player_a_sets between 0 and 3 and player_b_sets between 0 and 3 and player_a_sets<>player_b_sets)
);
create function public.validate_result_winner() returns trigger language plpgsql set search_path=public as $$
begin
  if new.result_type='FORFEIT' and not exists(select 1 from public.matches where id=new.match_id and new.winner_id in (player_a_id,player_b_id)) then raise exception '몰수승 선수가 경기 참가자와 일치하지 않습니다.'; end if;
  return new;
end $$;
create trigger validate_result_winner before insert or update on public.match_results for each row execute function public.validate_result_winner();
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  finalized_at timestamptz,
  revision bigint not null default 0,
  finalized_revision bigint,
  exclude using gist (daterange(start_date, end_date, '[]') with &&)
);
create table public.season_awards (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id),
  award_type text not null check (award_type in ('CHAMPION','ATTENDANCE_KING','WIN_KING')),
  player_id uuid not null references public.players(id),
  value integer not null check (value > 0),
  finalized_at timestamptz not null,
  unique(season_id, award_type, player_id)
);
alter table public.seasons enable row level security;
alter table public.season_awards enable row level security;
create policy "public seasons" on public.seasons for select using (true);
create policy "public awards" on public.season_awards for select using (true);
revoke all on public.seasons, public.season_awards from anon, authenticated;
grant select on public.seasons, public.season_awards to anon, authenticated;

create function public.season_for_date(p_date date) returns uuid
language plpgsql security definer set search_path = public as $$
declare result uuid; first_day date; last_day date;
begin
  -- Serialize auto-creation, including concurrent league creation.
  perform pg_advisory_xact_lock(609090001);
  select id into result from public.seasons where p_date between start_date and end_date;
  if result is null then
    first_day := date_trunc('quarter', p_date)::date;
    last_day := (first_day + interval '3 months - 1 day')::date;
    -- Custom seasons may occupy part of a quarter. Fill only the uncovered gap.
    select greatest(first_day, coalesce(max(end_date) + 1, first_day)) into first_day from public.seasons where end_date < p_date;
    select least(last_day, coalesce(min(start_date) - 1, last_day)) into last_day from public.seasons where start_date > p_date;
    insert into public.seasons(name,start_date,end_date)
      values (extract(year from p_date)::int || ' ' || extract(quarter from p_date)::int || '분기', first_day, last_day) returning id into result;
  end if;
  return result;
end $$;
revoke all on function public.season_for_date(date) from public;

alter table public.leagues add column season_id uuid references public.seasons(id);
-- Early releases predate bracket_generated; a started schedule is participation.
update public.leagues l set bracket_generated=true where status<>'DRAFT' and exists(select 1 from public.matches m where m.league_id=l.id);
update public.leagues set season_id = public.season_for_date(league_date);
alter table public.leagues alter column season_id set not null;
create index leagues_season_status on public.leagues(season_id,status);
create function public.assign_league_season() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.season_id is null then new.season_id := public.season_for_date(new.league_date);
  elsif tg_op = 'UPDATE' then
    if new.league_date is distinct from old.league_date and new.season_id = old.season_id then
      new.season_id := public.season_for_date(new.league_date);
    end if;
  end if;
  return new;
end $$;
create trigger assign_league_season before insert or update on public.leagues for each row execute function public.assign_league_season();

create function public.ensure_calendar_seasons() returns void language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'Asia/Seoul')::date;
begin
  perform public.season_for_date(today);
  perform public.season_for_date((date_trunc('quarter', today) + interval '3 months')::date);
end $$;
revoke all on function public.ensure_calendar_seasons() from public;
grant execute on function public.ensure_calendar_seasons() to anon, authenticated;
select public.ensure_calendar_seasons();

-- A BEFORE trigger locks the season before any source row changes. Finalization
-- takes the same lock so a review cannot be silently invalidated by a writer.
create function public.touch_season_source() returns trigger language plpgsql security definer set search_path = public as $$
declare old_season uuid; new_season uuid; league uuid;
begin
  if tg_table_name = 'leagues' then
    if tg_op <> 'INSERT' then old_season := old.season_id; end if;
    if tg_op <> 'DELETE' then new_season := new.season_id; end if;
  elsif tg_table_name = 'match_results' then
    if tg_op <> 'INSERT' then select l.season_id into old_season from public.matches m join public.leagues l on l.id=m.league_id where m.id=old.match_id; end if;
    if tg_op <> 'DELETE' then select l.season_id into new_season from public.matches m join public.leagues l on l.id=m.league_id where m.id=new.match_id; end if;
  else
    if tg_op <> 'INSERT' then select season_id into old_season from public.leagues where id=old.league_id; end if;
    if tg_op <> 'DELETE' then select season_id into new_season from public.leagues where id=new.league_id; end if;
  end if;
  perform id from public.seasons where id in (old_season,new_season) order by id for update;
  update public.seasons set revision=revision+1 where id in (old_season,new_season);
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger z_touch_season before insert or update or delete on public.leagues for each row execute function public.touch_season_source();
create trigger touch_season before insert or update or delete on public.matches for each row execute function public.touch_season_source();
create trigger touch_season before insert or update or delete on public.match_results for each row execute function public.touch_season_source();
create trigger touch_season before insert or update or delete on public.league_participants for each row execute function public.touch_season_source();
create trigger touch_season before insert or update or delete on public.league_standings for each row execute function public.touch_season_source();

create function public.finalize_season(p_season_id uuid, p_revision bigint) returns void
language plpgsql security definer set search_path = public as $$
declare s public.seasons; stamp timestamptz := now();
begin
  if not public.is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  select * into strict s from public.seasons where id=p_season_id for update;
  if s.end_date >= (now() at time zone 'Asia/Seoul')::date then raise exception '시즌 기간 종료 후 확정할 수 있습니다.'; end if;
  if p_revision is null or s.revision <> p_revision then raise exception '데이터가 변경되었습니다. 검수 화면을 새로고침해 주세요.'; end if;
  if exists(select 1 from public.leagues where season_id=s.id and status <> 'COMPLETED')
    or exists(select 1 from public.matches m join public.leagues l on l.id=m.league_id left join public.match_results r on r.match_id=m.id where l.season_id=s.id and r.id is null)
    or exists(select 1 from public.leagues l where l.season_id=s.id and (not l.bracket_generated or not exists(select 1 from public.league_participants p where p.league_id=l.id)))
    or exists(select 1 from public.league_participants p join public.leagues l on l.id=p.league_id left join public.league_standings st on st.league_id=l.id and st.player_id=p.player_id where l.season_id=s.id and st.id is null)
  then raise exception '미완료 리그, 결과 미입력 경기 또는 최종 순위 누락을 확인해 주세요.'; end if;
  delete from public.season_awards where season_id=s.id;
  insert into public.season_awards(season_id,award_type,player_id,value,finalized_at)
  with values_by_player as (
    select 'CHAMPION' as kind, st.player_id, count(*)::int as value from public.league_standings st join public.leagues l on l.id=st.league_id where l.season_id=s.id and l.status='COMPLETED' and l.bracket_generated and st.rank=1 group by st.player_id
    union all
    select 'ATTENDANCE_KING', p.player_id, count(*)::int from public.league_participants p join public.leagues l on l.id=p.league_id where l.season_id=s.id and l.status='COMPLETED' and l.bracket_generated group by p.player_id
    union all
    select 'WIN_KING', coalesce(r.winner_id,case when r.player_a_sets>r.player_b_sets then m.player_a_id else m.player_b_id end), count(*)::int from public.matches m join public.match_results r on r.match_id=m.id join public.leagues l on l.id=m.league_id where l.season_id=s.id and l.status='COMPLETED' and (r.winner_id is not null or r.player_a_sets<>r.player_b_sets) group by 2
  ), ranked as (select *, max(value) over(partition by kind) as best from values_by_player)
  select s.id,kind,player_id,value,stamp from ranked where value=best and value>0;
  update public.seasons set finalized_at=stamp, finalized_revision=revision where id=s.id;
end $$;
revoke all on function public.finalize_season(uuid,bigint) from public;
grant execute on function public.finalize_season(uuid,bigint) to authenticated;

create function public.save_season(p_id uuid,p_name text,p_start date,p_end date) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  perform pg_advisory_xact_lock(609090001);
  if p_id is null then insert into public.seasons(name,start_date,end_date) values(trim(p_name),p_start,p_end);
  else
    update public.seasons set name=trim(p_name),start_date=p_start,end_date=p_end,revision=revision+1 where id=p_id;
    if not found then raise exception '시즌을 찾을 수 없습니다.'; end if;
  end if;
end $$;
revoke all on function public.save_season(uuid,text,date,date) from public;
grant execute on function public.save_season(uuid,text,date,date) to authenticated;


-- Result history, correction and completed standings commit together.
create function public.save_reviewed_result(p_match_id uuid,p_revision bigint,p_a integer,p_b integer,p_type public.result_type,p_acknowledged boolean,p_standings jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare m public.matches; l public.leagues; s public.seasons; previous public.match_results; winner uuid; score_a integer; score_b integer;
begin
  if not public.is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  select * into strict m from public.matches where id=p_match_id;
  select * into strict l from public.leagues where id=m.league_id;
  select * into strict s from public.seasons where id=l.season_id for update;
  if p_revision is null or s.revision<>p_revision then raise exception '경기 데이터가 변경되었습니다. 새로고침 후 다시 입력해 주세요.'; end if;
  if s.finalized_at is not null and not coalesce(p_acknowledged,false) then raise exception '종료된 시즌의 수정 경고를 확인해 주세요.'; end if;
  if p_a is null or p_b is null or p_type is null or p_a not between 0 and 3 or p_b not between 0 and 3 or p_a=p_b then raise exception '경기 결과가 올바르지 않습니다.'; end if;
  if l.status='DRAFT' then raise exception '시작 전 리그입니다.'; end if;
  if l.status='COMPLETED' and (
    p_standings is null or jsonb_typeof(p_standings)<>'array' or jsonb_array_length(p_standings)<>(select count(*) from public.league_participants where league_id=l.id)
    or exists(select 1 from public.league_participants p where p.league_id=l.id and not exists(select 1 from jsonb_array_elements(p_standings) x where (x->>'player_id')::uuid=p.player_id))
  ) then raise exception '최종 순위 데이터가 누락되었습니다.'; end if;
  winner := case when p_type='FORFEIT' then case when p_a>p_b then m.player_a_id else m.player_b_id end else null end;
  score_a := case when p_type='FORFEIT' then 0 else p_a end;
  score_b := case when p_type='FORFEIT' then 0 else p_b end;
  select * into previous from public.match_results where match_id=m.id;
  if found then insert into public.match_result_history(match_id,old_result,new_result,changed_by) values(m.id,to_jsonb(previous),jsonb_build_object('player_a_sets',score_a,'player_b_sets',score_b,'result_type',p_type,'winner_id',winner),auth.uid()); end if;
  insert into public.match_results(match_id,player_a_sets,player_b_sets,result_type,winner_id,created_by)
    values(m.id,score_a,score_b,p_type,winner,auth.uid())
    on conflict(match_id) do update set player_a_sets=excluded.player_a_sets,player_b_sets=excluded.player_b_sets,result_type=excluded.result_type,winner_id=excluded.winner_id,updated_at=now();
  if l.status='COMPLETED' then
    delete from public.league_standings where league_id=l.id;
    insert into public.league_standings(league_id,player_id,rank,matches_played,wins,losses,sets_won,sets_lost,set_difference,tie_break_data)
      select l.id,x.player_id,x.rank,x.matches_played,x.wins,x.losses,x.sets_won,x.sets_lost,x.set_difference,'{"rules":"wins/head-to-head/mini-league/sets"}'::jsonb
      from jsonb_to_recordset(p_standings) as x(player_id uuid,rank integer,matches_played integer,wins integer,losses integer,sets_won integer,sets_lost integer,set_difference integer);
  end if;
end $$;
revoke all on function public.save_reviewed_result(uuid,bigint,integer,integer,public.result_type,boolean,jsonb) from public;
grant execute on function public.save_reviewed_result(uuid,bigint,integer,integer,public.result_type,boolean,jsonb) to authenticated;
