-- PyClasse MVP — eseguire nel SQL Editor di Supabase.
create extension if not exists pgcrypto;

create type public.user_role as enum ('teacher', 'student');
create type public.submission_status as enum ('draft', 'submitted', 'passed', 'partial', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

-- Configurazione privata: una sola riga e una sola email docente.
-- Sostituire l'indirizzo di esempio prima di abilitare gli accessi reali.
create table public.app_settings (
  singleton boolean primary key default true check (singleton),
  teacher_email text not null unique,
  school_name text not null default 'Liceo Galilei' check (char_length(school_name) between 2 and 100)
);
insert into public.app_settings (singleton, teacher_email)
values (true, 'docente@scuola.it');

create unique index profiles_single_teacher_idx
on public.profiles ((role)) where role = 'teacher';

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  join_code text not null unique check (join_code ~ '^[A-Z0-9-]{6,12}$'),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  starter_code text not null default '',
  verification_mode text not null default 'tests' check (verification_mode in ('tests', 'ai')),
  ai_evaluation_prompt text,
  deadline timestamptz,
  max_points integer not null default 100 check (max_points > 0),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.assignment_classes (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (assignment_id, class_id)
);

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  position integer not null default 0,
  input_data text not null default '',
  expected_output text not null,
  is_hidden boolean not null default true,
  points integer not null default 1 check (points > 0)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  status public.submission_status not null default 'draft',
  score integer not null default 0 check (score >= 0),
  test_results jsonb not null default '[]'::jsonb,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create index classes_teacher_idx on public.classes(teacher_id);
create index class_members_student_idx on public.class_members(student_id);
create index assignments_teacher_idx on public.assignments(teacher_id);
create index submissions_student_idx on public.submissions(student_id);
create index submissions_assignment_idx on public.submissions(assignment_id);

-- Crea automaticamente il profilo al primo login Google.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare assigned_role public.user_role;
begin
  select case
    when lower(new.email) = lower(s.teacher_email) then 'teacher'::public.user_role
    else 'student'::public.user_role
  end into assigned_role
  from public.app_settings s where s.singleton = true;

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', coalesce(assigned_role, 'student'));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Un utente autenticato non può promuoversi modificando il proprio profilo.
create or replace function public.prevent_role_change() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.role <> old.role and auth.role() = 'authenticated' then
    raise exception 'Il ruolo può essere modificato solo dall’amministratore';
  end if;
  return new;
end; $$;
create trigger prevent_profile_role_change before update of role on public.profiles
for each row execute procedure public.prevent_role_change();

-- Iscrizione atomica: il codice non espone l'elenco delle classi.
create or replace function public.join_class(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare target_id uuid;
begin
  select id into target_id from public.classes where join_code = upper(trim(code)) and archived_at is null;
  if target_id is null then raise exception 'Codice classe non valido'; end if;
  insert into public.class_members(class_id, student_id) values (target_id, auth.uid()) on conflict do nothing;
  return target_id;
end; $$;
revoke all on function public.join_class(text) from public;
grant execute on function public.join_class(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_classes enable row level security;
alter table public.tests enable row level security;
alter table public.submissions enable row level security;

create policy "profiles read self and classmates" on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.class_members me join public.class_members peer using (class_id)
    where me.student_id = auth.uid() and peer.student_id = profiles.id
  ) or exists (
    select 1 from public.classes c join public.class_members m on m.class_id = c.id
    where c.teacher_id = auth.uid() and m.student_id = profiles.id
  )
);
create policy "profiles update self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "teachers manage own classes" on public.classes for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "students read joined classes" on public.classes for select to authenticated using (
  exists (select 1 from public.class_members m where m.class_id = classes.id and m.student_id = auth.uid())
);

create policy "memberships visible to class" on public.class_members for select to authenticated using (
  student_id = auth.uid() or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
);
create policy "students leave class" on public.class_members for delete to authenticated using (student_id = auth.uid());
create policy "teachers remove members" on public.class_members for delete to authenticated using (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
);

create policy "teachers manage assignments" on public.assignments for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "students read published assignments" on public.assignments for select to authenticated using (
  published_at is not null and exists (
    select 1 from public.assignment_classes ac join public.class_members cm on cm.class_id = ac.class_id
    where ac.assignment_id = assignments.id and cm.student_id = auth.uid()
  )
);

create policy "teachers manage assignment links" on public.assignment_classes for all to authenticated using (
  exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
) with check (
  exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
  and exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
);
create policy "students read assignment links" on public.assignment_classes for select to authenticated using (
  exists (select 1 from public.class_members cm where cm.class_id = class_id and cm.student_id = auth.uid())
);

create policy "teachers manage tests" on public.tests for all to authenticated using (
  exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
) with check (exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid()));
create policy "students read public tests" on public.tests for select to authenticated using (
  not is_hidden and exists (
    select 1 from public.assignment_classes ac join public.class_members cm on cm.class_id = ac.class_id
    where ac.assignment_id = tests.assignment_id and cm.student_id = auth.uid()
  )
);

create policy "students manage own submissions" on public.submissions for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "teachers read class submissions" on public.submissions for select to authenticated using (
  exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
);
