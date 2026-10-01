-- Public scores do not need the auth.users identifier of their author.
revoke select on public.match_results from public, anon, authenticated;
revoke select (created_by) on public.match_results from public, anon, authenticated;
grant select (id, match_id, player_a_sets, player_b_sets, result_type, winner_id, created_at, updated_at)
  on public.match_results to anon, authenticated;

-- Realtime must also avoid publishing rows containing created_by.
alter publication supabase_realtime drop table public.match_results;
alter publication supabase_realtime add table public.matches;

create function public.notify_result_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.matches set updated_at = now()
  where id = case when tg_op = 'DELETE' then old.match_id else new.match_id end;
  return null;
end $$;
revoke all on function public.notify_result_change() from public;
create trigger notify_result_change after insert or update or delete
  on public.match_results for each row execute function public.notify_result_change();
