-- Login copy is application-owned localization content. Keeping it in
-- PostgreSQL exposed an unnecessary anonymous read surface and made a global
-- product message mutable from the teacher workspace.
drop function if exists public.get_public_branding(text);
drop function if exists public.get_public_branding();
drop table if exists public.app_branding_translations;
