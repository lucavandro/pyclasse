create table public.code_now_settings (
  singleton boolean primary key default true check (singleton),
  sharing_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.code_now_settings is
  'Global Code now sharing state. It contains no editor content or student data.';

insert into public.code_now_settings (singleton, sharing_enabled)
values (true, true);

alter table public.code_now_settings enable row level security;
alter table public.code_now_settings replica identity full;

create policy "authenticated users read Code now sharing"
on public.code_now_settings for select to authenticated
using (true);

create policy "teacher updates Code now sharing"
on public.code_now_settings for update to authenticated
using (public.is_teacher())
with check (public.is_teacher());

revoke all on table public.code_now_settings from public, anon;
grant select, update on table public.code_now_settings to authenticated;

alter publication supabase_realtime add table public.code_now_settings;

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
  if caller is null or not public.is_teacher() then
    raise exception 'Solo il docente può pubblicare Code now';
  end if;
  if length(current_code) > 100000 then
    raise exception 'Il codice supera il limite consentito';
  end if;
  insert into public.editor_sessions (
    user_id, context, class_assignment_id, code, active_until, updated_at
  ) values (
    caller, 'code_now', null, current_code,
    session_time + interval '60 seconds', session_time
  )
  on conflict (user_id) do update set
    context = excluded.context,
    class_assignment_id = null,
    code = excluded.code,
    active_until = excluded.active_until,
    updated_at = excluded.updated_at;
end;
$$;

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
  join public.code_now_settings settings on settings.singleton = true
  where caller.role = 'student'
    and settings.sharing_enabled
    and session.context = 'code_now'
    and session.active_until > now()
  order by session.updated_at desc
  limit 1;
$$;

revoke all on function public.get_active_teacher_code() from public, anon;
grant execute on function public.get_active_teacher_code() to authenticated;
