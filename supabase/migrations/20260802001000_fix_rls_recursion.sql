-- Break mutual RLS recursion with narrowly scoped authorization helpers.
create or replace function public.is_class_teacher(target_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.classes c
    where c.id = target_class and c.teacher_id = (select auth.uid())
  );
$$;

create or replace function public.is_class_member(target_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.class_members m
    where m.class_id = target_class and m.student_id = (select auth.uid())
  );
$$;

create or replace function public.can_read_profile(target_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select target_profile = (select auth.uid()) or exists (
    select 1
    from public.class_members mine
    join public.class_members theirs using (class_id)
    where mine.student_id = (select auth.uid()) and theirs.student_id = target_profile
  ) or exists (
    select 1
    from public.classes c
    join public.class_members m on m.class_id = c.id
    where c.teacher_id = (select auth.uid()) and m.student_id = target_profile
  );
$$;

create or replace function public.owns_exercise(target_exercise uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.exercises e
    where e.id = target_exercise and e.teacher_id = (select auth.uid())
  );
$$;

create or replace function public.student_can_access_exercise(target_exercise uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.class_assignments a
    join public.class_members m on m.class_id = a.class_id
    where a.exercise_id = target_exercise
      and a.published_at is not null
      and m.student_id = (select auth.uid())
  );
$$;

create or replace function public.owns_assignment_exercise(target_assignment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.class_assignments a
    join public.exercises e on e.id = a.exercise_id
    where a.id = target_assignment and e.teacher_id = (select auth.uid())
  );
$$;

revoke all on function public.is_class_teacher(uuid) from public, anon;
revoke all on function public.is_class_member(uuid) from public, anon;
revoke all on function public.can_read_profile(uuid) from public, anon;
revoke all on function public.owns_exercise(uuid) from public, anon;
revoke all on function public.student_can_access_exercise(uuid) from public, anon;
revoke all on function public.owns_assignment_exercise(uuid) from public, anon;
grant execute on function public.is_class_teacher(uuid) to authenticated;
grant execute on function public.is_class_member(uuid) to authenticated;
grant execute on function public.can_read_profile(uuid) to authenticated;
grant execute on function public.owns_exercise(uuid) to authenticated;
grant execute on function public.student_can_access_exercise(uuid) to authenticated;
grant execute on function public.owns_assignment_exercise(uuid) to authenticated;

alter policy "profiles read self and classmates" on public.profiles
  using ((select public.can_read_profile(id)));

alter policy "users read permitted classes" on public.classes
  using (teacher_id = (select auth.uid()) or (select public.is_class_member(id)));

alter policy "memberships visible to class" on public.class_members
  using (student_id = (select auth.uid()) or (select public.is_class_teacher(class_id)));
alter policy "users remove permitted memberships" on public.class_members
  using (student_id = (select auth.uid()) or (select public.is_class_teacher(class_id)));

alter policy "users read permitted exercises" on public.exercises
  using (teacher_id = (select auth.uid()) or (select public.student_can_access_exercise(id)));

alter policy "users read permitted class assignments" on public.class_assignments
  using ((select public.owns_exercise(exercise_id)) or (
    published_at is not null and (select public.is_class_member(class_id))
  ));
alter policy "teachers create class assignments" on public.class_assignments
  with check ((select public.owns_exercise(exercise_id)) and (select public.is_class_teacher(class_id)));
alter policy "teachers update class assignments" on public.class_assignments
  using ((select public.owns_exercise(exercise_id)))
  with check ((select public.owns_exercise(exercise_id)) and (select public.is_class_teacher(class_id)));
alter policy "teachers delete class assignments" on public.class_assignments
  using ((select public.owns_exercise(exercise_id)));

alter policy "users read permitted tests" on public.tests
  using ((select public.owns_exercise(exercise_id)) or (
    not is_hidden and (select public.student_can_access_exercise(exercise_id))
  ));
alter policy "teachers create tests" on public.tests
  with check ((select public.owns_exercise(exercise_id)));
alter policy "teachers update tests" on public.tests
  using ((select public.owns_exercise(exercise_id)))
  with check ((select public.owns_exercise(exercise_id)));
alter policy "teachers delete tests" on public.tests
  using ((select public.owns_exercise(exercise_id)));

alter policy "users read permitted submissions" on public.submissions
  using (student_id = (select auth.uid()) or (select public.owns_assignment_exercise(class_assignment_id)));
alter policy "users update permitted submissions" on public.submissions
  using (
    (student_id = (select auth.uid()) and status in ('draft', 'submitted'))
    or (select public.owns_assignment_exercise(class_assignment_id))
  );
