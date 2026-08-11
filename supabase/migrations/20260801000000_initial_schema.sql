


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto";







CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."submission_status" AS ENUM (
    'draft',
    'submitted',
    'passed',
    'partial',
    'failed'
);


ALTER TYPE "public"."submission_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'teacher',
    'student'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_student_to_class"("target_class" "uuid", "student_email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_student uuid;
begin
  if not public.is_class_teacher(target_class) then
    raise exception 'Classe non accessibile';
  end if;

  select p.id into target_student
  from public.profiles p
  where lower(p.email) = lower(trim(student_email))
    and p.role = 'student';

  if target_student is null then
    raise exception 'Nessuno studente trovato con questa email';
  end if;

  insert into public.class_members (class_id, student_id)
  values (target_class, target_student)
  on conflict do nothing;

  return target_student;
end;
$$;


ALTER FUNCTION "public"."add_student_to_class"("target_class" "uuid", "student_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attribute_submission_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_by := (select auth.uid());
  return new;
end;
$$;


ALTER FUNCTION "public"."attribute_submission_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_profile"("target_profile" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select target_profile = (select auth.uid()) or exists (
    select 1
    from public.class_members mine
    join public.class_members theirs using (class_id)
    where mine.student_id = (select auth.uid()) and theirs.student_id = target_profile
  ) or exists (
    select 1
    from public.classes c
    join public.class_members m on m.class_id = c.id
    where c.teacher_id = (select auth.uid()) and m.student_id = target_profile
  );
$$;


ALTER FUNCTION "public"."can_read_profile"("target_profile" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_editor_session"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  update public.editor_sessions
  set active_until = now(), updated_at = now()
  where user_id = (select auth.uid());
$$;


ALTER FUNCTION "public"."close_editor_session"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_teacher_code"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select session.code
  from public.editor_sessions session
  join public.profiles teacher
    on teacher.id = session.user_id and teacher.role = 'teacher'
  join public.profiles caller on caller.id = (select auth.uid())
  where caller.role = 'student'
    and session.context = 'code_now'
    and session.active_until > now()
  order by session.updated_at desc
  limit 1;
$$;


ALTER FUNCTION "public"."get_active_teacher_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_branding"() RETURNS TABLE("login_title_it" "text", "login_subtitle_it" "text", "login_title_en" "text", "login_subtitle_en" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    settings.login_title_it,
    settings.login_subtitle_it,
    settings.login_title_en,
    settings.login_subtitle_en
  from public.app_settings settings
  where settings.singleton = true;
$$;


ALTER FUNCTION "public"."get_public_branding"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_class_member"("target_class" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.class_members m
    where m.class_id = target_class and m.student_id = (select auth.uid())
  );
$$;


ALTER FUNCTION "public"."is_class_member"("target_class" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_class_teacher"("target_class" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.classes c
    where c.id = target_class and c.teacher_id = (select auth.uid())
  );
$$;


ALTER FUNCTION "public"."is_class_teacher"("target_class" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_class"("code" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare target_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'student'
  ) then
    raise exception 'Solo uno studente autenticato può iscriversi a una classe';
  end if;
  select id into target_id from public.classes where join_code = upper(trim(code)) and archived_at is null;
  if target_id is null then raise exception 'Codice classe non valido'; end if;
  insert into public.class_members(class_id, student_id) values (target_id, auth.uid()) on conflict do nothing;
  return target_id;
end; $$;


ALTER FUNCTION "public"."join_class"("code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_ungraded_submission"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."normalize_ungraded_submission"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_assignment_exercise"("target_assignment" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.class_assignments a
    join public.exercises e on e.id = a.exercise_id
    where a.id = target_assignment and e.teacher_id = (select auth.uid())
  );
$$;


ALTER FUNCTION "public"."owns_assignment_exercise"("target_assignment" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_exercise"("target_exercise" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.exercises e
    where e.id = target_exercise and e.teacher_id = (select auth.uid())
  );
$$;


ALTER FUNCTION "public"."owns_exercise"("target_exercise" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_role_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.role <> old.role and auth.role() = 'authenticated' then
    raise exception 'Il ruolo può essere modificato solo dall’amministratore';
  end if;
  return new;
end; $$;


ALTER FUNCTION "public"."prevent_role_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prune_editor_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare removed integer;
begin
  delete from public.editor_sessions where active_until <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;


ALTER FUNCTION "public"."prune_editor_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_code_now"("current_code" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  caller uuid := (select auth.uid());
  session_time timestamptz := now();
begin
  if caller is null then
    raise exception 'Autenticazione richiesta';
  end if;
  if length(current_code) > 100000 then
    raise exception 'Il codice supera il limite consentito';
  end if;
  insert into public.editor_sessions (
    user_id, context, class_assignment_id, code, active_until, updated_at
  ) values (
    caller, 'code_now', null, current_code,
    session_time + interval '25 seconds', session_time
  )
  on conflict (user_id) do update set
    context = excluded.context,
    class_assignment_id = null,
    code = excluded.code,
    active_until = excluded.active_until,
    updated_at = excluded.updated_at;
end;
$$;


ALTER FUNCTION "public"."publish_code_now"("current_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."student_can_access_exercise"("target_exercise" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.class_assignments a
    join public.class_members m on m.class_id = a.class_id
    where a.exercise_id = target_exercise
      and a.published_at is not null
      and m.student_id = (select auth.uid())
  );
$$;


ALTER FUNCTION "public"."student_can_access_exercise"("target_exercise" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."student_can_submit_to_assignment"("target_assignment" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.class_assignments target
    join public.class_members member on member.class_id = target.class_id
    where target.id = target_assignment
      and target.published_at is not null
      and member.student_id = (select auth.uid())
      and not exists (
        select 1
        from public.class_assignments previous
        join public.exercises prerequisite on prerequisite.id = previous.exercise_id
        where previous.class_id = target.class_id
          and previous.published_at is not null
          and previous.position < target.position
          and prerequisite.is_prerequisite
          and not exists (
            select 1
            from public.submissions delivered
            where delivered.class_assignment_id = previous.id
              and delivered.student_id = (select auth.uid())
              and delivered.status <> 'draft'
          )
      )
  );
$$;


ALTER FUNCTION "public"."student_can_submit_to_assignment"("target_assignment" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "singleton" boolean DEFAULT true NOT NULL,
    "teacher_email" "text",
    "school_name" "text" DEFAULT 'Liceo Galilei'::"text" NOT NULL,
    "login_title_it" "text" DEFAULT 'Il laboratorio Python della tua classe.'::"text" NOT NULL,
    "login_subtitle_it" "text" DEFAULT 'Crea esercizi, segui i progressi e accompagna ogni studente nel suo percorso.'::"text" NOT NULL,
    "login_title_en" "text" DEFAULT 'The Python lab for your classroom.'::"text" NOT NULL,
    "login_subtitle_en" "text" DEFAULT 'Create exercises, follow progress and support every student on their path.'::"text" NOT NULL,
    CONSTRAINT "app_settings_login_subtitle_en_check" CHECK ((("char_length"("login_subtitle_en") >= 5) AND ("char_length"("login_subtitle_en") <= 240))),
    CONSTRAINT "app_settings_login_subtitle_it_check" CHECK ((("char_length"("login_subtitle_it") >= 5) AND ("char_length"("login_subtitle_it") <= 240))),
    CONSTRAINT "app_settings_login_title_en_check" CHECK ((("char_length"("login_title_en") >= 5) AND ("char_length"("login_title_en") <= 120))),
    CONSTRAINT "app_settings_login_title_it_check" CHECK ((("char_length"("login_title_it") >= 5) AND ("char_length"("login_title_it") <= 120))),
    CONSTRAINT "app_settings_school_name_check" CHECK ((("char_length"("school_name") >= 2) AND ("char_length"("school_name") <= 100))),
    CONSTRAINT "app_settings_singleton_check" CHECK ("singleton")
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignment_views" (
    "class_assignment_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "first_opened_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assignment_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "deadline" timestamp with time zone,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "position" integer NOT NULL,
    "grading_scale" smallint,
    CONSTRAINT "class_assignments_grading_scale_check" CHECK (("grading_scale" = ANY (ARRAY[10, 100]))),
    CONSTRAINT "class_assignments_position_positive" CHECK (("position" > 0))
);


ALTER TABLE "public"."class_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_members" (
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."class_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "join_code" "text" NOT NULL,
    "archived_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subject" "text" DEFAULT 'Informatica'::"text" NOT NULL,
    CONSTRAINT "classes_join_code_check" CHECK (("join_code" ~ '^[A-Z0-9-]{6,12}$'::"text")),
    CONSTRAINT "classes_name_check" CHECK ((("char_length"("name") >= 2) AND ("char_length"("name") <= 100))),
    CONSTRAINT "classes_subject_check" CHECK ((("char_length"("subject") >= 2) AND ("char_length"("subject") <= 100)))
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."code_snippets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "code_snippets_name_check" CHECK ((("char_length"(TRIM(BOTH FROM "name")) >= 1) AND ("char_length"(TRIM(BOTH FROM "name")) <= 120)))
);


ALTER TABLE "public"."code_snippets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."editor_sessions" (
    "user_id" "uuid" NOT NULL,
    "context" "text" NOT NULL,
    "class_assignment_id" "uuid",
    "code" "text" DEFAULT ''::"text" NOT NULL,
    "active_until" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "editor_sessions_check" CHECK (((("context" = 'exercise'::"text") AND ("class_assignment_id" IS NOT NULL)) OR (("context" = 'code_now'::"text") AND ("class_assignment_id" IS NULL)))),
    CONSTRAINT "editor_sessions_context_check" CHECK (("context" = ANY (ARRAY['exercise'::"text", 'code_now'::"text"])))
);

ALTER TABLE ONLY "public"."editor_sessions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."editor_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "starter_code" "text" DEFAULT ''::"text" NOT NULL,
    "verification_mode" "text" DEFAULT 'tests'::"text" NOT NULL,
    "ai_evaluation_prompt" "text",
    "max_points" integer DEFAULT 100 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "constraints" "text" DEFAULT ''::"text" NOT NULL,
    "is_prerequisite" boolean DEFAULT true NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "description_format" "text" DEFAULT 'markdown'::"text" NOT NULL,
    "resource_url" "text",
    "resource_label" "text",
    CONSTRAINT "exercises_description_format_check" CHECK (("description_format" = 'markdown'::"text")),
    CONSTRAINT "exercises_max_points_check" CHECK (("max_points" > 0)),
    CONSTRAINT "exercises_resource_label_check" CHECK ((("resource_label" IS NULL) OR (("char_length"("resource_label") >= 1) AND ("char_length"("resource_label") <= 120)))),
    CONSTRAINT "exercises_resource_url_check" CHECK ((("resource_url" IS NULL) OR ("resource_url" ~ '^https://[^[:space:]]+$'::"text"))),
    CONSTRAINT "exercises_verification_mode_check" CHECK (("verification_mode" = ANY (ARRAY['tests'::"text", 'ai'::"text"])))
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


COMMENT ON COLUMN "public"."exercises"."description" IS 'Exercise brief written in Markdown.';



COMMENT ON COLUMN "public"."exercises"."resource_url" IS 'Optional HTTPS website or YouTube learning resource.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone,
    "external_ai_enabled" boolean DEFAULT false NOT NULL,
    "external_ai_consented_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_assignment_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "status" "public"."submission_status" DEFAULT 'draft'::"public"."submission_status" NOT NULL,
    "score" integer,
    "test_results" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "submitted_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "submissions_score_check" CHECK ((("score" IS NULL) OR (("score" >= 0) AND ("score" <= 100))))
);

ALTER TABLE ONLY "public"."submissions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "input_data" "text" DEFAULT ''::"text" NOT NULL,
    "expected_output" "text" NOT NULL,
    "is_hidden" boolean DEFAULT true NOT NULL,
    "points" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "tests_points_check" CHECK (("points" > 0))
);


ALTER TABLE "public"."tests" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("singleton");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_teacher_email_key" UNIQUE ("teacher_email");



ALTER TABLE ONLY "public"."assignment_views"
    ADD CONSTRAINT "assignment_views_pkey" PRIMARY KEY ("class_assignment_id", "student_id");



ALTER TABLE ONLY "public"."class_assignments"
    ADD CONSTRAINT "class_assignments_exercise_id_class_id_key" UNIQUE ("exercise_id", "class_id");



ALTER TABLE ONLY "public"."class_assignments"
    ADD CONSTRAINT "class_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_pkey" PRIMARY KEY ("class_id", "student_id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_join_code_key" UNIQUE ("join_code");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."code_snippets"
    ADD CONSTRAINT "code_snippets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."editor_sessions"
    ADD CONSTRAINT "editor_sessions_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_class_assignment_id_student_id_key" UNIQUE ("class_assignment_id", "student_id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_pkey" PRIMARY KEY ("id");



CREATE INDEX "assignment_views_student_idx" ON "public"."assignment_views" USING "btree" ("student_id");



CREATE INDEX "class_assignments_class_idx" ON "public"."class_assignments" USING "btree" ("class_id");



CREATE INDEX "class_assignments_class_position_idx" ON "public"."class_assignments" USING "btree" ("class_id", "position");



CREATE INDEX "class_members_student_idx" ON "public"."class_members" USING "btree" ("student_id");



CREATE INDEX "classes_teacher_idx" ON "public"."classes" USING "btree" ("teacher_id");



CREATE INDEX "code_snippets_owner_updated_idx" ON "public"."code_snippets" USING "btree" ("owner_id", "updated_at" DESC);



CREATE INDEX "editor_sessions_active_idx" ON "public"."editor_sessions" USING "btree" ("context", "active_until" DESC);



CREATE INDEX "exercises_tags_idx" ON "public"."exercises" USING "gin" ("tags");



CREATE INDEX "exercises_teacher_idx" ON "public"."exercises" USING "btree" ("teacher_id");



CREATE INDEX "profiles_last_seen_idx" ON "public"."profiles" USING "btree" ("last_seen_at");



CREATE UNIQUE INDEX "profiles_single_teacher_idx" ON "public"."profiles" USING "btree" ("role") WHERE ("role" = 'teacher'::"public"."user_role");



CREATE INDEX "submissions_class_assignment_idx" ON "public"."submissions" USING "btree" ("class_assignment_id");



CREATE INDEX "submissions_live_monitor_idx" ON "public"."submissions" USING "btree" ("class_assignment_id", "updated_at" DESC);



CREATE INDEX "submissions_student_idx" ON "public"."submissions" USING "btree" ("student_id");



CREATE INDEX "tests_exercise_idx" ON "public"."tests" USING "btree" ("exercise_id");



CREATE OR REPLACE TRIGGER "attribute_submission_change" BEFORE INSERT OR UPDATE ON "public"."submissions" FOR EACH ROW EXECUTE FUNCTION "public"."attribute_submission_change"();



CREATE OR REPLACE TRIGGER "normalize_ungraded_submission" BEFORE INSERT OR UPDATE ON "public"."submissions" FOR EACH ROW EXECUTE FUNCTION "public"."normalize_ungraded_submission"();



CREATE OR REPLACE TRIGGER "prevent_profile_role_change" BEFORE UPDATE OF "role" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_role_change"();



ALTER TABLE ONLY "public"."assignment_views"
    ADD CONSTRAINT "assignment_views_class_assignment_id_fkey" FOREIGN KEY ("class_assignment_id") REFERENCES "public"."class_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignment_views"
    ADD CONSTRAINT "assignment_views_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_assignments"
    ADD CONSTRAINT "class_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_assignments"
    ADD CONSTRAINT "class_assignments_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."code_snippets"
    ADD CONSTRAINT "code_snippets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."editor_sessions"
    ADD CONSTRAINT "editor_sessions_class_assignment_id_fkey" FOREIGN KEY ("class_assignment_id") REFERENCES "public"."class_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."editor_sessions"
    ADD CONSTRAINT "editor_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_class_assignment_id_fkey" FOREIGN KEY ("class_assignment_id") REFERENCES "public"."class_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assignment_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated read settings" ON "public"."app_settings" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."class_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."code_snippets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."editor_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "memberships visible to class" ON "public"."class_members" FOR SELECT TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_class_teacher"("class_members"."class_id") AS "is_class_teacher")));



CREATE POLICY "owners create code snippets" ON "public"."code_snippets" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "owners delete code snippets" ON "public"."code_snippets" FOR DELETE TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "owners read code snippets" ON "public"."code_snippets" FOR SELECT TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "owners update code snippets" ON "public"."code_snippets" FOR UPDATE TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles read self and classmates" ON "public"."profiles" FOR SELECT TO "authenticated" USING (( SELECT "public"."can_read_profile"("profiles"."id") AS "can_read_profile"));



CREATE POLICY "profiles update self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ((("id" = ( SELECT "auth"."uid"() AS "uid")) AND ("lower"("email") = "lower"(COALESCE((( SELECT "auth"."jwt"() AS "jwt") ->> 'email'::"text"), "email")))));



CREATE POLICY "students create own drafts" ON "public"."submissions" FOR INSERT TO "authenticated" WITH CHECK ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'draft'::"public"."submission_status") AND ("score" IS NULL) AND ("test_results" = '[]'::"jsonb") AND ("submitted_at" IS NULL) AND ( SELECT "public"."student_can_submit_to_assignment"("submissions"."class_assignment_id") AS "student_can_submit_to_assignment")));



CREATE POLICY "students record their assignment views" ON "public"."assignment_views" FOR INSERT TO "authenticated" WITH CHECK ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."class_assignments" "a"
  WHERE (("a"."id" = "assignment_views"."class_assignment_id") AND ("a"."published_at" IS NOT NULL) AND ( SELECT "public"."is_class_member"("a"."class_id") AS "is_class_member"))))));



ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teacher updates settings" ON "public"."app_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'teacher'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'teacher'::"public"."user_role")))));



CREATE POLICY "teachers create class assignments" ON "public"."class_assignments" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "public"."owns_exercise"("class_assignments"."exercise_id") AS "owns_exercise") AND ( SELECT "public"."is_class_teacher"("class_assignments"."class_id") AS "is_class_teacher")));



CREATE POLICY "teachers create exercises" ON "public"."exercises" FOR INSERT TO "authenticated" WITH CHECK (("teacher_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "teachers create own classes" ON "public"."classes" FOR INSERT TO "authenticated" WITH CHECK (("teacher_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "teachers create tests" ON "public"."tests" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."owns_exercise"("tests"."exercise_id") AS "owns_exercise"));



CREATE POLICY "teachers delete class assignments" ON "public"."class_assignments" FOR DELETE TO "authenticated" USING (( SELECT "public"."owns_exercise"("class_assignments"."exercise_id") AS "owns_exercise"));



CREATE POLICY "teachers delete exercises" ON "public"."exercises" FOR DELETE TO "authenticated" USING (("teacher_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "teachers delete own classes" ON "public"."classes" FOR DELETE TO "authenticated" USING (("teacher_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "teachers delete tests" ON "public"."tests" FOR DELETE TO "authenticated" USING (( SELECT "public"."owns_exercise"("tests"."exercise_id") AS "owns_exercise"));



CREATE POLICY "teachers update class assignments" ON "public"."class_assignments" FOR UPDATE TO "authenticated" USING (( SELECT "public"."owns_exercise"("class_assignments"."exercise_id") AS "owns_exercise")) WITH CHECK ((( SELECT "public"."owns_exercise"("class_assignments"."exercise_id") AS "owns_exercise") AND ( SELECT "public"."is_class_teacher"("class_assignments"."class_id") AS "is_class_teacher")));



CREATE POLICY "teachers update exercises" ON "public"."exercises" FOR UPDATE TO "authenticated" USING (("teacher_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("teacher_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "teachers update own classes" ON "public"."classes" FOR UPDATE TO "authenticated" USING (("teacher_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("teacher_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "teachers update tests" ON "public"."tests" FOR UPDATE TO "authenticated" USING (( SELECT "public"."owns_exercise"("tests"."exercise_id") AS "owns_exercise")) WITH CHECK (( SELECT "public"."owns_exercise"("tests"."exercise_id") AS "owns_exercise"));



ALTER TABLE "public"."tests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users and teachers read permitted editor sessions" ON "public"."editor_sessions" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("context" = 'exercise'::"text") AND ( SELECT "public"."owns_assignment_exercise"("editor_sessions"."class_assignment_id") AS "owns_assignment_exercise"))));



CREATE POLICY "users create own editor session" ON "public"."editor_sessions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users delete own editor session" ON "public"."editor_sessions" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users read permitted assignment views" ON "public"."assignment_views" FOR SELECT TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."owns_assignment_exercise"("assignment_views"."class_assignment_id") AS "owns_assignment_exercise")));



CREATE POLICY "users read permitted class assignments" ON "public"."class_assignments" FOR SELECT TO "authenticated" USING ((( SELECT "public"."owns_exercise"("class_assignments"."exercise_id") AS "owns_exercise") OR (("published_at" IS NOT NULL) AND ( SELECT "public"."is_class_member"("class_assignments"."class_id") AS "is_class_member"))));



CREATE POLICY "users read permitted classes" ON "public"."classes" FOR SELECT TO "authenticated" USING ((("teacher_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_class_member"("classes"."id") AS "is_class_member")));



CREATE POLICY "users read permitted exercises" ON "public"."exercises" FOR SELECT TO "authenticated" USING ((("teacher_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."student_can_access_exercise"("exercises"."id") AS "student_can_access_exercise")));



CREATE POLICY "users read permitted submissions" ON "public"."submissions" FOR SELECT TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."owns_assignment_exercise"("submissions"."class_assignment_id") AS "owns_assignment_exercise")));



CREATE POLICY "users read permitted tests" ON "public"."tests" FOR SELECT TO "authenticated" USING ((( SELECT "public"."owns_exercise"("tests"."exercise_id") AS "owns_exercise") OR ((NOT "is_hidden") AND ( SELECT "public"."student_can_access_exercise"("tests"."exercise_id") AS "student_can_access_exercise"))));



CREATE POLICY "users remove permitted memberships" ON "public"."class_members" FOR DELETE TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_class_teacher"("class_members"."class_id") AS "is_class_teacher")));



CREATE POLICY "users update own editor session" ON "public"."editor_sessions" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users update permitted submissions" ON "public"."submissions" FOR UPDATE TO "authenticated" USING (((("student_id" = ( SELECT "auth"."uid"() AS "uid")) AND ( SELECT "public"."student_can_submit_to_assignment"("submissions"."class_assignment_id") AS "student_can_submit_to_assignment")) OR ( SELECT "public"."owns_assignment_exercise"("submissions"."class_assignment_id") AS "owns_assignment_exercise"))) WITH CHECK (((("student_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = ANY (ARRAY['draft'::"public"."submission_status", 'submitted'::"public"."submission_status"])) AND ("score" IS NULL) AND ("test_results" = '[]'::"jsonb") AND ( SELECT "public"."student_can_submit_to_assignment"("submissions"."class_assignment_id") AS "student_can_submit_to_assignment")) OR ( SELECT "public"."owns_assignment_exercise"("submissions"."class_assignment_id") AS "owns_assignment_exercise")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."editor_sessions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."submissions";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




























































































































































REVOKE ALL ON FUNCTION "public"."add_student_to_class"("target_class" "uuid", "student_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_student_to_class"("target_class" "uuid", "student_email" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."can_read_profile"("target_profile" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_read_profile"("target_profile" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."close_editor_session"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."close_editor_session"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_active_teacher_code"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_active_teacher_code"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_public_branding"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_branding"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_branding"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_class_member"("target_class" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_class_member"("target_class" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_class_teacher"("target_class" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_class_teacher"("target_class" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."join_class"("code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."join_class"("code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."owns_assignment_exercise"("target_assignment" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."owns_assignment_exercise"("target_assignment" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."owns_exercise"("target_exercise" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."owns_exercise"("target_exercise" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."prune_editor_sessions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prune_editor_sessions"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."publish_code_now"("current_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."publish_code_now"("current_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."student_can_access_exercise"("target_exercise" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."student_can_access_exercise"("target_exercise" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."student_can_submit_to_assignment"("target_assignment" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."student_can_submit_to_assignment"("target_assignment" "uuid") TO "authenticated";


















GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."app_settings" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."app_settings" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."assignment_views" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."assignment_views" TO "service_role";



GRANT ALL ON TABLE "public"."class_assignments" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."class_assignments" TO "service_role";



GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."class_members" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."class_members" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."code_snippets" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."code_snippets" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."editor_sessions" TO "anon";
GRANT ALL ON TABLE "public"."editor_sessions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."editor_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exercises" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."submissions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON TABLE "public"."tests" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tests" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();
