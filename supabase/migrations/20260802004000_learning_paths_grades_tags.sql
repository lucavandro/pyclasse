-- Learning paths, optional grades and exercise taxonomy.
alter table public.exercises
  add column is_prerequisite boolean not null default true,
  add column tags text[] not null default '{}';

create index exercises_tags_idx on public.exercises using gin(tags);

alter table public.class_assignments
  add column grading_enabled boolean not null default false,
  add column position integer;

with ranked as (
  select id, row_number() over (partition by class_id order by created_at, id)::integer as next_position
  from public.class_assignments
)
update public.class_assignments a
set position = ranked.next_position
from ranked
where ranked.id = a.id;

alter table public.class_assignments
  alter column position set not null,
  add constraint class_assignments_position_positive check (position > 0);
create index class_assignments_class_position_idx on public.class_assignments(class_id, position);

alter table public.submissions alter column score drop not null;
alter table public.submissions alter column score drop default;

create or replace function public.normalize_ungraded_submission()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'submitted' then new.score := null; end if;
  return new;
end;
$$;

drop trigger if exists normalize_ungraded_submission on public.submissions;
create trigger normalize_ungraded_submission before insert or update on public.submissions
for each row execute function public.normalize_ungraded_submission();
alter table public.submissions drop constraint submissions_score_check;
alter table public.submissions add constraint submissions_score_check
  check (score is null or score between 0 and 100);
update public.submissions set score = null where status in ('draft', 'submitted');

create or replace function public.student_can_submit_to_assignment(target_assignment uuid) returns boolean
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
            select 1 from public.submissions completed
            where completed.class_assignment_id = previous.id
              and completed.student_id = (select auth.uid())
              and completed.status = 'passed'
          )
      )
  );
$$;

alter policy "students create own drafts" on public.submissions with check (
  student_id = (select auth.uid())
  and status = 'draft'
  and score is null
  and test_results = '[]'::jsonb
  and submitted_at is null
  and (select public.student_can_submit_to_assignment(class_assignment_id))
);

alter policy "users update permitted submissions" on public.submissions with check (
  (
    student_id = (select auth.uid())
    and status in ('draft', 'submitted')
    and score is null
    and test_results = '[]'::jsonb
    and (select public.student_can_submit_to_assignment(class_assignment_id))
  )
  or (select public.owns_assignment_exercise(class_assignment_id))
);
