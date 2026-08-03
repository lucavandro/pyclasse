-- Complete the schema used by the live application. No demo records are added.
alter table public.profiles
  add column last_seen_at timestamptz,
  add column external_ai_enabled boolean not null default false,
  add column external_ai_consented_at timestamptz;

alter table public.classes
  add column subject text not null default 'Informatica'
  check (char_length(subject) between 2 and 100);

alter table public.exercises
  add column constraints text not null default '';

alter table public.app_settings alter column teacher_email drop not null;

-- Remove the old development placeholder. A clean database contains no fake identity.
delete from public.app_settings where teacher_email = 'docente@scuola.it';

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare assigned_role public.user_role;
begin
  -- The first account bootstraps a new installation as teacher. Later accounts
  -- are students unless their email matches the configured teacher address.
  select case
    when not exists (select 1 from public.profiles) then 'teacher'::public.user_role
    when exists (
      select 1 from public.app_settings s
      where s.singleton = true and lower(s.teacher_email) = lower(new.email)
    ) then 'teacher'::public.user_role
    else 'student'::public.user_role
  end into assigned_role;

  insert into public.profiles (id, email, full_name, avatar_url, role, last_seen_at)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    assigned_role,
    now()
  );

  if assigned_role = 'teacher' then
    insert into public.app_settings (singleton, teacher_email, school_name)
    values (true, new.email, 'PyClasse')
    on conflict (singleton) do update set teacher_email = excluded.teacher_email;
  end if;
  return new;
end; $$;

create policy "authenticated read settings" on public.app_settings
  for select to authenticated using (true);
create policy "teacher updates settings" on public.app_settings
  for update to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'teacher'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'teacher'
  ));

create index profiles_last_seen_idx on public.profiles(last_seen_at);
