create table public.code_snippets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  code text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index code_snippets_owner_updated_idx on public.code_snippets(owner_id, updated_at desc);
alter table public.code_snippets enable row level security;
create policy "owners read code snippets" on public.code_snippets for select to authenticated using (owner_id = (select auth.uid()));
create policy "owners create code snippets" on public.code_snippets for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owners update code snippets" on public.code_snippets for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owners delete code snippets" on public.code_snippets for delete to authenticated using (owner_id = (select auth.uid()));
revoke all on public.code_snippets from anon;
grant select, insert, update, delete on public.code_snippets to authenticated;
