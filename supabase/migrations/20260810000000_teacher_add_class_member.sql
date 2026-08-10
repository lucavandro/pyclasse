-- Allow a teacher to add a student by email without exposing the student directory.
create or replace function public.add_student_to_class(
  target_class uuid,
  student_email text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_student uuid;
begin
  if not public.is_class_teacher(target_class) then
    raise exception 'Classe non accessibile';
  end if;

  select p.id into target_student
  from public.profiles p
  where lower(p.email) = lower(trim(student_email))
    and p.role = 'student';

  if target_student is null then
    raise exception 'Nessuno studente trovato con questa email';
  end if;

  insert into public.class_members (class_id, student_id)
  values (target_class, target_student)
  on conflict do nothing;

  return target_student;
end;
$$;

revoke all on function public.add_student_to_class(uuid, text) from public, anon;
grant execute on function public.add_student_to_class(uuid, text) to authenticated;
