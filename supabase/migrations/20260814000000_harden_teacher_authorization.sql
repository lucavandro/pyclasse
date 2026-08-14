-- Make the role check part of every teacher ownership decision. Ownership
-- alone is not an authorization boundary because authenticated students can
-- choose their own UUID in insert payloads.
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles profile
    where profile.id = (select auth.uid()) and profile.role = 'teacher'
  );
$$;

create or replace function public.is_class_teacher(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_teacher() and exists (
    select 1 from public.classes classroom
    where classroom.id = target_class
      and classroom.teacher_id = (select auth.uid())
  );
$$;

create or replace function public.owns_exercise(target_exercise uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_teacher() and exists (
    select 1 from public.exercises exercise
    where exercise.id = target_exercise
      and exercise.teacher_id = (select auth.uid())
  );
$$;

create or replace function public.owns_assignment_exercise(target_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_teacher() and exists (
    select 1
    from public.class_assignments assignment
    join public.exercises exercise on exercise.id = assignment.exercise_id
    where assignment.id = target_assignment
      and exercise.teacher_id = (select auth.uid())
  );
$$;

drop policy "teachers create exercises" on public.exercises;
create policy "teachers create exercises"
on public.exercises for insert to authenticated
with check (public.is_teacher() and teacher_id = (select auth.uid()));

drop policy "teachers update exercises" on public.exercises;
create policy "teachers update exercises"
on public.exercises for update to authenticated
using (public.is_teacher() and teacher_id = (select auth.uid()))
with check (public.is_teacher() and teacher_id = (select auth.uid()));

drop policy "teachers delete exercises" on public.exercises;
create policy "teachers delete exercises"
on public.exercises for delete to authenticated
using (public.is_teacher() and teacher_id = (select auth.uid()));

drop policy "teachers create own classes" on public.classes;
create policy "teachers create own classes"
on public.classes for insert to authenticated
with check (public.is_teacher() and teacher_id = (select auth.uid()));

drop policy "teachers update own classes" on public.classes;
create policy "teachers update own classes"
on public.classes for update to authenticated
using (public.is_teacher() and teacher_id = (select auth.uid()))
with check (public.is_teacher() and teacher_id = (select auth.uid()));

drop policy "teachers delete own classes" on public.classes;
create policy "teachers delete own classes"
on public.classes for delete to authenticated
using (public.is_teacher() and teacher_id = (select auth.uid()));

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

revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;
