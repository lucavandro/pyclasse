create table public.app_branding_translations (
  locale text primary key,
  title text not null,
  subtitle text not null,
  constraint app_branding_translations_locale_check
    check (locale ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'),
  constraint app_branding_translations_title_check
    check (char_length(title) between 5 and 120),
  constraint app_branding_translations_subtitle_check
    check (char_length(subtitle) between 5 and 240)
);

insert into public.app_branding_translations (locale, title, subtitle)
select locale, title, subtitle
from public.app_settings settings
cross join lateral (
  values
    ('it', settings.login_title_it, settings.login_subtitle_it),
    ('en', settings.login_title_en, settings.login_subtitle_en)
) as translations(locale, title, subtitle)
where settings.singleton = true;

alter table public.app_branding_translations enable row level security;

create policy "authenticated read branding translations"
on public.app_branding_translations
for select
to authenticated
using (true);

create policy "teachers insert branding translations"
on public.app_branding_translations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'teacher'
  )
);

create policy "teachers update branding translations"
on public.app_branding_translations
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'teacher'
  )
)
with check (
  exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'teacher'
  )
);

drop function public.get_public_branding();

create function public.get_public_branding(target_locale text default 'it')
returns table(locale text, title text, subtitle text)
language sql
stable
security definer
set search_path = ''
as $$
  select branding.locale, branding.title, branding.subtitle
  from public.app_branding_translations branding
  where branding.locale in (
    lower(split_part(coalesce(target_locale, 'it'), '-', 1)),
    'it'
  )
  order by
    (branding.locale = lower(split_part(coalesce(target_locale, 'it'), '-', 1))) desc,
    branding.locale
  limit 1;
$$;

alter function public.get_public_branding(text) owner to postgres;
revoke all on function public.get_public_branding(text) from public;
grant execute on function public.get_public_branding(text) to anon, authenticated;

grant select, insert, update, delete
on table public.app_branding_translations
to authenticated;

alter table public.app_settings
  drop column login_title_it,
  drop column login_subtitle_it,
  drop column login_title_en,
  drop column login_subtitle_en;
