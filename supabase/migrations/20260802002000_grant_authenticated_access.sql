-- Supabase projects with auto_expose_new_tables disabled require explicit grants.
-- RLS remains the row-level authorization boundary for every granted operation.
revoke all on all tables in schema public from anon;

grant select, update on public.profiles to authenticated;
grant select, update on public.app_settings to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, delete on public.class_members to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.class_assignments to authenticated;
grant select, insert, update, delete on public.tests to authenticated;
grant select, insert, update on public.submissions to authenticated;
