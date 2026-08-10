-- Short-lived editor presence supports monitoring without long-term activity tracking.
create table public.editor_sessions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  context text not null check (context in ('exercise', 'code_now')),
  class_assignment_id uuid references public.class_assignments(id) on delete cascade,
  code text not null default '',
  active_until timestamptz not null,
  updated_at timestamptz not null default now(),
  check (
    (context = 'exercise' and class_assignment_id is not null) or
    (context = 'code_now' and class_assignment_id is null)
  )
);

alter table public.editor_sessions enable row level security;

create policy "users create own editor session" on public.editor_sessions
for insert to authenticated with check (user_id = (select auth.uid()));

create policy "users update own editor session" on public.editor_sessions
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "users delete own editor session" on public.editor_sessions
for delete to authenticated using (user_id = (select auth.uid()));

create policy "users and teachers read permitted editor sessions" on public.editor_sessions
for select to authenticated using (
  user_id = (select auth.uid()) or (
    context = 'exercise' and
    (select public.owns_assignment_exercise(class_assignment_id))
  )
);

grant select, insert, update, delete on public.editor_sessions to authenticated;

create index editor_sessions_active_idx
  on public.editor_sessions(context, active_until desc);

alter table public.editor_sessions replica identity full;
alter publication supabase_realtime add table public.editor_sessions;

create or replace function public.prune_editor_sessions()
returns integer language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  delete from public.editor_sessions where active_until <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.prune_editor_sessions() from public, anon;
grant execute on function public.prune_editor_sessions() to authenticated;

create or replace function public.publish_code_now(current_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  session_time timestamptz := now();
begin
  if caller is null then
    raise exception 'Autenticazione richiesta';
  end if;
  if length(current_code) > 100000 then
    raise exception 'Il codice supera il limite consentito';
  end if;
  insert into public.editor_sessions (
    user_id, context, class_assignment_id, code, active_until, updated_at
  ) values (
    caller, 'code_now', null, current_code,
    session_time + interval '25 seconds', session_time
  )
  on conflict (user_id) do update set
    context = excluded.context,
    class_assignment_id = null,
    code = excluded.code,
    active_until = excluded.active_until,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.publish_code_now(text) from public, anon;
grant execute on function public.publish_code_now(text) to authenticated;

create or replace function public.close_editor_session()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.editor_sessions
  set active_until = now(), updated_at = now()
  where user_id = (select auth.uid());
$$;

revoke all on function public.close_editor_session() from public, anon;
grant execute on function public.close_editor_session() to authenticated;

create or replace function public.get_active_teacher_code()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select session.code
  from public.editor_sessions session
  join public.profiles teacher
    on teacher.id = session.user_id and teacher.role = 'teacher'
  join public.profiles caller on caller.id = (select auth.uid())
  where caller.role = 'student'
    and session.context = 'code_now'
    and session.active_until > now()
  order by session.updated_at desc
  limit 1;
$$;

revoke all on function public.get_active_teacher_code() from public, anon;
grant execute on function public.get_active_teacher_code() to authenticated;
