-- Students may revise their own evaluated work. The WITH CHECK clause already
-- restricts the resulting row to draft/submitted with no score or forged tests.
alter policy "users update permitted submissions" on public.submissions
  using (
    (
      student_id = (select auth.uid())
      and (select public.student_can_submit_to_assignment(class_assignment_id))
    )
    or (select public.owns_assignment_exercise(class_assignment_id))
  );
