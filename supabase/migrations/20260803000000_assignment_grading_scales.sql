-- Assignments can be ungraded or use either the Italian /10 scale or /100.
alter table public.class_assignments
  add column grading_scale smallint
  check (grading_scale in (10, 100));

update public.class_assignments
set grading_scale = case when grading_enabled then 100 else null end;

alter table public.class_assignments drop column grading_enabled;

-- Drafts and submitted work are never graded. Final evaluations must match
-- the scale selected on their assignment, and ungraded work always stays NULL.
create or replace function public.normalize_ungraded_submission()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare selected_scale smallint;
begin
  select assignment.grading_scale into selected_scale
  from public.class_assignments assignment
  where assignment.id = new.class_assignment_id;

  if new.status in ('draft', 'submitted') or selected_scale is null then
    new.score := null;
  elsif new.score is null or new.score < 0 or new.score > selected_scale then
    raise exception 'score must be between 0 and %', selected_scale;
  end if;

  return new;
end;
$$;
