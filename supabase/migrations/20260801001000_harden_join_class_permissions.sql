-- Security hardening: joining a class requires an authenticated user.
-- Supabase may grant EXECUTE on public functions to API roles, so revoke the
-- privilege explicitly instead of relying only on the implicit PUBLIC role.
revoke all on function public.join_class(text) from public;
revoke all on function public.join_class(text) from anon;
grant execute on function public.join_class(text) to authenticated;
