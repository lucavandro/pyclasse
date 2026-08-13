create or replace function public.touch_editor_session(
  target_assignment uuid,
  current_code text
) returns void
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

  if not exists (
    select 1
    from public.class_assignments assignment
    join public.class_members membership
      on membership.class_id = assignment.class_id
     and membership.student_id = caller
    join public.profiles profile
      on profile.id = caller
     and profile.role = 'student'
    where assignment.id = target_assignment
      and assignment.published_at is not null
  ) then
    raise exception 'Compito non accessibile';
  end if;

  insert into public.editor_sessions (
    user_id, context, class_assignment_id, code, active_until, updated_at
  ) values (
    caller, 'exercise', target_assignment, current_code,
    session_time + interval '25 seconds', session_time
  )
  on conflict (user_id) do update set
    context = excluded.context,
    class_assignment_id = excluded.class_assignment_id,
    code = excluded.code,
    active_until = excluded.active_until,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.touch_editor_session(uuid, text) from public;
grant execute on function public.touch_editor_session(uuid, text) to authenticated;
