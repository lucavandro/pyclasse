create table public.assignment_views (
  class_assignment_id uuid not null references public.class_assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  first_opened_at timestamptz not null default now(),
  primary key (class_assignment_id, student_id)
);

create index assignment_views_student_idx on public.assignment_views(student_id);
alter table public.assignment_views enable row level security;

create policy "users read permitted assignment views" on public.assignment_views
for select to authenticated
using (
  student_id = (select auth.uid())
  or (select public.owns_assignment_exercise(class_assignment_id))
);

create policy "students record their assignment views" on public.assignment_views
for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1
    from public.class_assignments a
    where a.id = class_assignment_id
      and a.published_at is not null
      and (select public.is_class_member(a.class_id))
  )
);

revoke all on public.assignment_views from anon;
grant select, insert on public.assignment_views to authenticated;
