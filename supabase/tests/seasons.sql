-- Run after migrations in a development Supabase database / SQL Editor.
-- Requires one existing admin user. Every fixture is rolled back.
begin;
do $$
declare
  administrator uuid; sid uuid; lid uuid; mid uuid;
  pa uuid := gen_random_uuid(); pb uuid := gen_random_uuid();
  rev bigint; blocked boolean; payload jsonb;
begin
  select user_id into administrator from public.admin_users limit 1;
  if administrator is null then raise exception 'Create a development admin before running this test.'; end if;
  perform set_config('request.jwt.claim.sub',administrator::text,true);
  insert into public.seasons(name,start_date,end_date) values('시즌 회귀 테스트','1900-01-01','1900-03-31') returning id into sid;
  insert into public.players(id,name) values(pa,'동명이인 테스트'),(pb,'동명이인 테스트');
  insert into public.leagues(round_number,league_date,status,bracket_generated)
    values((select coalesce(max(round_number),0)+1 from public.leagues),'1900-01-07','IN_PROGRESS',true) returning id into lid;
  assert (select season_id=sid from public.leagues where id=lid), 'automatic assignment';
  insert into public.league_participants(league_id,player_id,name_snapshot,schedule_position) values(lid,pa,'동명이인 테스트',1),(lid,pb,'동명이인 테스트',2);
  insert into public.matches(league_id,player_a_id,player_b_id,round_no,round_match_no) values(lid,pa,pb,1,1) returning id into mid;
  select revision into rev from public.seasons where id=sid;
  blocked := false;
  begin perform public.finalize_season(sid,rev); exception when others then blocked:=true; end;
  assert blocked, 'unfinished league must block finalization';
  update public.leagues set status='COMPLETED' where id=lid;
  insert into public.league_standings(league_id,player_id,rank,matches_played,wins,losses,sets_won,sets_lost,set_difference)
    values(lid,pa,1,1,1,0,0,0,0),(lid,pb,2,1,0,1,0,0,0);
  select revision into rev from public.seasons where id=sid;
  blocked:=false;
  begin perform public.finalize_season(sid,rev); exception when others then blocked:=true; end;
  assert blocked, 'missing results must block finalization';
  insert into public.match_results(match_id,player_a_sets,player_b_sets,result_type,winner_id,created_by) values(mid,0,0,'FORFEIT',pa,administrator);
  select revision into rev from public.seasons where id=sid;
  perform public.finalize_season(sid,rev);
  assert (select count(*)=4 from public.season_awards where season_id=sid), 'one champion, tied attendance, one winner';
  assert (select player_id=pa from public.season_awards where season_id=sid and award_type='WIN_KING'), 'forfeit winner';
  payload:=jsonb_build_array(
    jsonb_build_object('player_id',pa,'rank',2,'matches_played',1,'wins',0,'losses',1,'sets_won',0,'sets_lost',2,'set_difference',-2),
    jsonb_build_object('player_id',pb,'rank',1,'matches_played',1,'wins',1,'losses',0,'sets_won',2,'sets_lost',0,'set_difference',2));
  blocked:=false;
  begin perform public.save_reviewed_result(mid,rev,0,2,'NORMAL',false,payload); exception when others then blocked:=true; end;
  assert blocked, 'finalized correction requires acknowledgment';
  perform public.save_reviewed_result(mid,rev,0,2,'NORMAL',true,payload);
  assert (select revision<>finalized_revision from public.seasons where id=sid), 'correction marks season dirty';
  assert (select player_id=pa from public.season_awards where season_id=sid and award_type='CHAMPION'), 'awards stay unchanged until refinalization';
  assert (select count(*)=1 from public.match_result_history where match_id=mid), 'atomic history';
  blocked:=false;
  begin perform public.finalize_season(sid,rev); exception when others then blocked:=true; end;
  assert blocked, 'stale review blocked';
  select revision into rev from public.seasons where id=sid;
  perform public.finalize_season(sid,rev);
  assert (select player_id=pb from public.season_awards where season_id=sid and award_type='CHAMPION'), 'refinalization replaces awards';
  assert (select revision=finalized_revision from public.seasons where id=sid), 'refinalization clears dirty flag';
end $$;
rollback;
