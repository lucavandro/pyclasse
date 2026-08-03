-- Realtime draft monitoring and collaborative teacher intervention.
alter table public.submissions
  add column updated_by uuid references public.profiles(id) on delete set null;

create or replace function public.attribute_submission_change()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

create trigger attribute_submission_change
before insert or update on public.submissions
for each row execute function public.attribute_submission_change();

alter table public.submissions replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submissions'
  ) then
    alter publication supabase_realtime add table public.submissions;
  end if;
end $$;

create index submissions_live_monitor_idx
  on public.submissions(class_assignment_id, updated_at desc);
