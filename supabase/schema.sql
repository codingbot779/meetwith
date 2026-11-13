create table if not exists public.meetings (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.meetings enable row level security;

drop policy if exists "Anyone can create meetings" on public.meetings;
create policy "Anyone can create meetings"
  on public.meetings for insert to anon
  with check (true);

drop policy if exists "Anyone can view meetings" on public.meetings;
create policy "Anyone can view meetings"
  on public.meetings for select to anon
  using (true);

drop policy if exists "Anyone can update meetings" on public.meetings;
create policy "Anyone can update meetings"
  on public.meetings for update to anon
  using (true) with check (true);
