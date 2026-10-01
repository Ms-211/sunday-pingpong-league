alter table public.leagues
  drop constraint if exists leagues_best_of_sets_check;

alter table public.leagues
  add constraint leagues_best_of_sets_check
  check (best_of_sets in (3, 5));
