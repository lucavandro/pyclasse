-- Teacher-managed public copy for the unauthenticated login screen.
alter table public.app_settings
  add column login_title_it text not null default 'Il laboratorio Python della tua classe.'
    check (char_length(login_title_it) between 5 and 120),
  add column login_subtitle_it text not null default 'Crea esercizi, segui i progressi e accompagna ogni studente nel suo percorso.'
    check (char_length(login_subtitle_it) between 5 and 240),
  add column login_title_en text not null default 'The Python lab for your classroom.'
    check (char_length(login_title_en) between 5 and 120),
  add column login_subtitle_en text not null default 'Create exercises, follow progress and support every student on their path.'
    check (char_length(login_subtitle_en) between 5 and 240);

-- Anonymous users receive only the four presentation strings. Private
-- settings such as the teacher email are deliberately excluded.
create or replace function public.get_public_branding()
returns table (
  login_title_it text,
  login_subtitle_it text,
  login_title_en text,
  login_subtitle_en text
)
language sql stable security definer set search_path = '' as $$
  select
    settings.login_title_it,
    settings.login_subtitle_it,
    settings.login_title_en,
    settings.login_subtitle_en
  from public.app_settings settings
  where settings.singleton = true;
$$;

revoke all on function public.get_public_branding() from public;
grant execute on function public.get_public_branding() to anon, authenticated;
