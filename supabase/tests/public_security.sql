-- Run as the database owner after applying all migrations. No data is changed.
begin;
do $$
begin
  assert not has_column_privilege('anon', 'public.match_results', 'created_by', 'SELECT'), 'anonymous author UUID leak';
  assert not has_column_privilege('authenticated', 'public.match_results', 'created_by', 'SELECT'), 'authenticated author UUID leak';
  assert has_column_privilege('anon', 'public.match_results', 'player_a_sets', 'SELECT'), 'public score access';
  assert has_column_privilege('authenticated', 'public.match_results', 'winner_id', 'SELECT'), 'operator score access';
  assert not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='match_results'), 'Realtime author UUID leak';
  assert exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='matches'), 'Realtime score notifications';
  assert not has_function_privilege('anon', 'public.save_reviewed_result(uuid,bigint,integer,integer,public.result_type,boolean,jsonb)', 'EXECUTE'), 'anonymous write RPC';
end $$;
rollback;
