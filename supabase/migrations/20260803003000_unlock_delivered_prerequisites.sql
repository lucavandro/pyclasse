-- A prerequisite is satisfied when the student has delivered it. Evaluation is
-- a later teacher action and must not prevent access to subsequent assignments.
create or replace function public.student_can_submit_to_assignment(target_assignment uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.class_assignments target
    join public.class_members member on member.class_id = target.class_id
    where target.id = target_assignment
      and target.published_at is not null
      and member.student_id = (select auth.uid())
      and not exists (
        select 1
        from public.class_assignments previous
        join public.exercises prerequisite on prerequisite.id = previous.exercise_id
        where previous.class_id = target.class_id
          and previous.published_at is not null
          and previous.position < target.position
          and prerequisite.is_prerequisite
          and not exists (
            select 1
            from public.submissions delivered
            where delivered.class_assignment_id = previous.id
              and delivered.student_id = (select auth.uid())
              and delivered.status <> 'draft'
          )
      )
  );
$$;
