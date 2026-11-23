alter table public.meetings
  add column price numeric(10, 2) check (price >= 0);
