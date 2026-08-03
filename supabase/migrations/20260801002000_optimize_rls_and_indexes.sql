-- Performance hardening recommended by the Supabase Database Advisor.
-- `(select auth.uid())` and `(select auth.jwt())` are evaluated once per query.

create index class_assignments_class_idx on public.class_assignments(class_id);
create index tests_exercise_idx on public.tests(exercise_id);

alter policy "profiles read self and classmates" on public.profiles using (
  id = (select auth.uid()) or exists (
    select 1 from public.class_members me join public.class_members peer using (class_id)
    where me.student_id = (select auth.uid()) and peer.student_id = profiles.id
  ) or exists (
    select 1 from public.classes c join public.class_members m on m.class_id = c.id
    where c.teacher_id = (select auth.uid()) and m.student_id = profiles.id
  )
);
alter policy "profiles update self" on public.profiles
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and lower(email) = lower(coalesce((select auth.jwt())->>'email', email))
  );

drop policy "teachers manage own classes" on public.classes;
drop policy "students read joined classes" on public.classes;
create policy "users read permitted classes" on public.classes for select to authenticated using (
  teacher_id = (select auth.uid()) or exists (
    select 1 from public.class_members m
    where m.class_id = classes.id and m.student_id = (select auth.uid())
  )
);
create policy "teachers create own classes" on public.classes for insert to authenticated
  with check (teacher_id = (select auth.uid()));
create policy "teachers update own classes" on public.classes for update to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "teachers delete own classes" on public.classes for delete to authenticated
  using (teacher_id = (select auth.uid()));

alter policy "memberships visible to class" on public.class_members using (
  student_id = (select auth.uid()) or exists (
    select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid())
  )
);
drop policy "students leave class" on public.class_members;
drop policy "teachers remove members" on public.class_members;
create policy "users remove permitted memberships" on public.class_members for delete to authenticated using (
  student_id = (select auth.uid()) or exists (
    select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid())
  )
);

drop policy "teachers manage exercises" on public.exercises;
drop policy "students read assigned exercises" on public.exercises;
create policy "users read permitted exercises" on public.exercises for select to authenticated using (
  teacher_id = (select auth.uid()) or exists (
    select 1 from public.class_assignments ca join public.class_members cm on cm.class_id = ca.class_id
    where ca.exercise_id = exercises.id and ca.published_at is not null
      and cm.student_id = (select auth.uid())
  )
);
create policy "teachers create exercises" on public.exercises for insert to authenticated
  with check (teacher_id = (select auth.uid()));
create policy "teachers update exercises" on public.exercises for update to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "teachers delete exercises" on public.exercises for delete to authenticated
  using (teacher_id = (select auth.uid()));

drop policy "teachers manage class assignments" on public.class_assignments;
drop policy "students read class assignments" on public.class_assignments;
create policy "users read permitted class assignments" on public.class_assignments for select to authenticated using (
  exists (select 1 from public.exercises e where e.id = exercise_id and e.teacher_id = (select auth.uid()))
  or (
    published_at is not null and exists (
      select 1 from public.class_members cm
      where cm.class_id = class_id and cm.student_id = (select auth.uid())
    )
  )
);
create policy "teachers create class assignments" on public.class_assignments for insert to authenticated with check (
  exists (select 1 from public.exercises e where e.id = exercise_id and e.teacher_id = (select auth.uid()))
  and exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
);
create policy "teachers update class assignments" on public.class_assignments for update to authenticated
  using (exists (select 1 from public.exercises e where e.id = exercise_id and e.teacher_id = (select auth.uid())))
  with check (
    exists (select 1 from public.exercises e where e.id = exercise_id and e.teacher_id = (select auth.uid()))
    and exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
  );
create policy "teachers delete class assignments" on public.class_assignments for delete to authenticated
  using (exists (select 1 from public.exercises e where e.id = exercise_id and e.teacher_id = (select auth.uid())));

drop policy "teachers manage tests" on public.tests;
drop policy "students read public tests" on public.tests;
create policy "users read permitted tests" on public.tests for select to authenticated using (
  exists (select 1 from public.exercises e where e.id = exercise_id and e.teacher_id = (select auth.uid()))
  or (
    not is_hidden and exists (
      select 1 from public.class_assignments ca join public.class_members cm on cm.class_id = ca.class_id
      where ca.exercise_id = tests.exercise_id and ca.published_at is not null
        and cm.student_id = (select auth.uid())
    )
  )
);
create policy "teachers create tests" on public.tests for insert to authenticated
  with check (exists (select 1 from public.exercises e where e.id = exercise_id and e.teacher_id = (select auth.uid())));
create policy "teachers update tests" on public.tests for update to authenticated
  using (exists (select 1 from public.exercises e where e.id = exercise_id and e.teacher_id = (select auth.uid())))
  with check (exists (select 1 from public.exercises e where e.id = exercise_id and e.teacher_id = (select auth.uid())));
create policy "teachers delete tests" on public.tests for delete to authenticated
  using (exists (select 1 from public.exercises e where e.id = exercise_id and e.teacher_id = (select auth.uid())));

alter policy "students create own drafts" on public.submissions with check (
  student_id = (select auth.uid()) and status = 'draft' and score = 0
  and test_results = '[]'::jsonb and submitted_at is null
  and exists (
    select 1 from public.class_assignments ca join public.class_members cm on cm.class_id = ca.class_id
    where ca.id = class_assignment_id and ca.published_at is not null
      and cm.student_id = (select auth.uid())
  )
);
drop policy "students read own submissions" on public.submissions;
drop policy "teachers read class submissions" on public.submissions;
create policy "users read permitted submissions" on public.submissions for select to authenticated using (
  student_id = (select auth.uid()) or exists (
    select 1 from public.class_assignments ca join public.exercises e on e.id = ca.exercise_id
    where ca.id = class_assignment_id and e.teacher_id = (select auth.uid())
  )
);
drop policy "students update own ungraded submissions" on public.submissions;
drop policy "teachers grade class submissions" on public.submissions;
create policy "users update permitted submissions" on public.submissions for update to authenticated using (
  (student_id = (select auth.uid()) and status in ('draft', 'submitted'))
  or exists (
    select 1 from public.class_assignments ca join public.exercises e on e.id = ca.exercise_id
    where ca.id = class_assignment_id and e.teacher_id = (select auth.uid())
  )
) with check (
  (
    student_id = (select auth.uid()) and status in ('draft', 'submitted')
    and score = 0 and test_results = '[]'::jsonb
    and exists (
      select 1 from public.class_assignments ca join public.class_members cm on cm.class_id = ca.class_id
      where ca.id = class_assignment_id and ca.published_at is not null
        and cm.student_id = (select auth.uid())
    )
  )
  or exists (
    select 1 from public.class_assignments ca join public.exercises e on e.id = ca.exercise_id
    where ca.id = class_assignment_id and e.teacher_id = (select auth.uid())
  )
);
