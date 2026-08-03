create or replace function public.student_can_submit_to_assignment(target_assignment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.class_assignments a
    join public.class_members m on m.class_id = a.class_id
    where a.id = target_assignment
      and a.published_at is not null
      and m.student_id = (select auth.uid())
  );
$$;

revoke all on function public.student_can_submit_to_assignment(uuid) from public, anon;
grant execute on function public.student_can_submit_to_assignment(uuid) to authenticated;

alter policy "students create own drafts" on public.submissions with check (
  student_id = (select auth.uid())
  and status = 'draft'
  and score = 0
  and test_results = '[]'::jsonb
  and submitted_at is null
  and (select public.student_can_submit_to_assignment(class_assignment_id))
);

alter policy "users update permitted submissions" on public.submissions with check (
  (
    student_id = (select auth.uid())
    and status in ('draft', 'submitted')
    and score = 0
    and test_results = '[]'::jsonb
    and (select public.student_can_submit_to_assignment(class_assignment_id))
  )
  or (select public.owns_assignment_exercise(class_assignment_id))
);
