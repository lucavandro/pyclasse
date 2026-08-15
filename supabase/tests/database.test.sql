begin;

select plan(82);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'app_settings', 'app_settings table exists');
select has_table('public', 'classes', 'classes table exists');
select has_table('public', 'class_members', 'class_members table exists');
select has_table('public', 'exercises', 'exercises table exists');
select has_table('public', 'class_assignments', 'class_assignments table exists');
select has_table('public', 'tests', 'tests table exists');
select has_table('public', 'submissions', 'submissions table exists');
select has_table('public', 'editor_sessions', 'editor sessions table exists');
select has_table('public', 'assignment_views', 'assignment views table exists');
select has_table('public', 'code_snippets', 'personal code snippets table exists');
select is(
  (select count(*)::integer from public.code_snippets where owner_id = '10000000-0000-0000-0000-000000000001'),
  2,
  'the local teacher has two saved Code now fixtures'
);
select is(
  (select count(*)::integer from public.code_snippets where owner_id::text like '20000000-0000-0000-0000-00000000000%'),
  5,
  'local students have saved Code now fixtures'
);
select has_table('public', 'code_now_settings', 'Code now sharing settings table exists');
select has_column('public', 'code_now_settings', 'sharing_enabled', 'Code now sharing can be disabled');
select col_default_is('public', 'code_now_settings', 'sharing_enabled', 'true', 'Code now sharing starts enabled');

select ok(
  (select bool_and(c.relrowsecurity)
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any(array[
       'profiles', 'app_settings', 'classes', 'class_members', 'exercises',
       'class_assignments', 'tests', 'submissions', 'editor_sessions', 'assignment_views', 'code_snippets', 'code_now_settings'
     ])),
  'RLS is enabled on every application table'
);

select ok(
  (select count(*) >= 15 from pg_policies where schemaname = 'public'),
  'application tables have the expected RLS policy set'
);

select has_function('public', 'join_class', array['text'], 'join_class function exists');
select ok(
  has_function_privilege('authenticated', 'public.join_class(text)', 'EXECUTE'),
  'authenticated users can join a class'
);
select ok(
  not has_function_privilege('anon', 'public.join_class(text)', 'EXECUTE'),
  'anonymous users cannot execute join_class'
);
select has_function('public', 'add_student_to_class', array['uuid', 'text'], 'teacher add member function exists');
select ok(
  has_function_privilege('authenticated', 'public.add_student_to_class(uuid,text)', 'EXECUTE'),
  'authenticated teachers can request a manual class membership'
);
select ok(
  not has_function_privilege('anon', 'public.add_student_to_class(uuid,text)', 'EXECUTE'),
  'anonymous users cannot add class members'
);
select has_function('public', 'get_active_teacher_code', array[]::text[], 'active teacher code function exists');
select ok(
  has_function_privilege('authenticated', 'public.get_active_teacher_code()', 'EXECUTE'),
  'authenticated students can request active teacher code'
);
select ok(
  not has_function_privilege('anon', 'public.get_active_teacher_code()', 'EXECUTE'),
  'anonymous users cannot request teacher code'
);
select has_function('public', 'prune_editor_sessions', array[]::text[], 'expired editor session cleanup exists');
select ok(
  has_function_privilege('authenticated', 'public.prune_editor_sessions()', 'EXECUTE'),
  'authenticated users can remove expired editor sessions'
);
select ok(
  not has_function_privilege('anon', 'public.prune_editor_sessions()', 'EXECUTE'),
  'anonymous users cannot invoke editor session cleanup'
);
select has_function('public', 'publish_code_now', array['text'], 'Code now publication function exists');
select ok(
  has_function_privilege('authenticated', 'public.publish_code_now(text)', 'EXECUTE'),
  'authenticated users can publish their current Code now content'
);
select ok(
  not has_function_privilege('anon', 'public.publish_code_now(text)', 'EXECUTE'),
  'anonymous users cannot publish Code now content'
);
select has_function('public', 'close_editor_session', array[]::text[], 'editor session close function exists');
select ok(
  has_function_privilege('authenticated', 'public.close_editor_session()', 'EXECUTE'),
  'authenticated users can close their editor session'
);
select ok(
  not has_function_privilege('anon', 'public.close_editor_session()', 'EXECUTE'),
  'anonymous users cannot close editor sessions'
);
select has_function('public', 'touch_editor_session', array['uuid', 'text'], 'exercise presence heartbeat function exists');
select ok(
  has_function_privilege('authenticated', 'public.touch_editor_session(uuid,text)', 'EXECUTE'),
  'authenticated students can refresh their exercise presence'
);
select ok(
  not has_function_privilege('anon', 'public.touch_editor_session(uuid,text)', 'EXECUTE'),
  'anonymous users cannot publish exercise presence'
);
select has_index('public', 'editor_sessions', 'editor_sessions_active_idx', 'active editor sessions are indexed');
select ok(
  (select exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'editor_sessions')),
  'editor sessions are published to Supabase Realtime'
);
select ok(
  (select exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'code_now_settings')),
  'Code now sharing settings are published to Supabase Realtime'
);
select ok(
  (select qual like '%is_teacher%' and with_check like '%is_teacher%'
   from pg_policies
   where schemaname = 'public' and tablename = 'code_now_settings'
     and policyname = 'teacher updates Code now sharing'),
  'only the teacher can change Code now sharing'
);
select ok(
  pg_get_functiondef('public.get_active_teacher_code()'::regprocedure) like '%sharing_enabled%',
  'teacher code retrieval checks the current sharing setting'
);
select ok(
  pg_get_functiondef('public.publish_code_now(text)'::regprocedure) like '%60 seconds%',
  'Code now tolerates background-tab heartbeat throttling'
);
select ok(
  not has_table_privilege('anon', 'public.code_now_settings', 'SELECT'),
  'anonymous users cannot read Code now sharing settings'
);
select ok(
  has_table_privilege('authenticated', 'public.code_now_settings', 'SELECT'),
  'authenticated users can read Code now sharing settings'
);

select has_index('public', 'class_assignments', 'class_assignments_class_idx', 'class assignments class foreign key is indexed');
select has_index('public', 'tests', 'tests_exercise_idx', 'tests exercise foreign key is indexed');
select is(
  (select count(*)::integer from (
    select schemaname, tablename, roles, cmd
    from pg_policies
    where schemaname = 'public' and permissive = 'PERMISSIVE'
    group by schemaname, tablename, roles, cmd
    having count(*) > 1
  ) duplicated),
  0,
  'there are no overlapping permissive policies for the same role and action'
);

select has_column('public', 'classes', 'subject', 'classes store their subject');
select has_column('public', 'exercises', 'constraints', 'exercises store constraints');
select has_column('public', 'profiles', 'last_seen_at', 'profiles store real activity timestamps');
select has_column('public', 'profiles', 'external_ai_consented_at', 'AI consent has an audit timestamp');
select has_column('public', 'exercises', 'is_prerequisite', 'exercises store prerequisite behavior');
select has_column('public', 'exercises', 'tags', 'exercises store filter tags');
select has_column('public', 'class_assignments', 'grading_scale', 'assignments store their grading scale');
select col_type_is('public', 'class_assignments', 'grading_scale', 'smallint', 'grading scale uses a bounded integer type');
select ok(
  (select pg_get_constraintdef(oid) like '%grading_scale%10%100%'
   from pg_constraint
   where conrelid = 'public.class_assignments'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) like '%grading_scale%'),
  'grading scale accepts only 10 or 100'
);
select has_column('public', 'class_assignments', 'position', 'assignments store learning-path order');
select has_column('public', 'submissions', 'score', 'submissions store nullable scores');
select hasnt_table('public', 'app_branding_translations', 'login copy is not stored in the database');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_settings'
      and column_name like 'login_%_it' or
      table_schema = 'public' and table_name = 'app_settings'
      and column_name like 'login_%_en'
  ),
  'settings no longer add one column per locale'
);
select hasnt_function('public', 'get_public_branding', array['text'], 'the anonymous login branding function was removed');
select has_index('public', 'exercises', 'exercises_tags_idx', 'exercise tags have a GIN index');
select has_index('public', 'class_assignments', 'class_assignments_class_position_idx', 'learning-path lookup is indexed');
select has_function('public', 'student_can_submit_to_assignment', array['uuid'], 'prerequisite submission guard exists');
select has_column('public', 'exercises', 'description_format', 'exercise brief format is explicit');
select has_column('public', 'exercises', 'resource_url', 'exercises support an external resource URL');
select has_column('public', 'exercises', 'resource_label', 'external resources have an accessible label');
select col_default_is('public', 'exercises', 'description_format', 'markdown', 'Markdown is the default brief format');
select has_column('public', 'submissions', 'updated_by', 'live drafts identify the last editor');
select has_index('public', 'submissions', 'submissions_live_monitor_idx', 'live monitoring lookup is indexed');
select ok((select exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submissions')), 'submissions are published to Supabase Realtime');
select has_trigger('public', 'submissions', 'attribute_submission_change', 'submission changes are attributed by the database');
select is(
  (select count(*)::integer from public.app_settings where teacher_email = 'docente@scuola.it'),
  0,
  'clean installations contain no placeholder teacher identity'
);

select has_function('public', 'is_teacher', array[]::text[], 'teacher role guard exists');
select ok(
  has_function_privilege('authenticated', 'public.is_teacher()', 'EXECUTE'),
  'authenticated policies can evaluate the teacher role guard'
);
select ok(
  not has_function_privilege('anon', 'public.is_teacher()', 'EXECUTE'),
  'anonymous users cannot evaluate the teacher role guard'
);
select ok(
  (select with_check like '%is_teacher%'
   from pg_policies
   where schemaname = 'public' and tablename = 'classes'
     and policyname = 'teachers create own classes'),
  'creating a class requires the teacher role'
);
select ok(
  (select with_check like '%is_teacher%'
   from pg_policies
   where schemaname = 'public' and tablename = 'exercises'
     and policyname = 'teachers create exercises'),
  'creating an exercise requires the teacher role'
);
select ok(
  pg_get_functiondef('public.publish_code_now(text)'::regprocedure) like '%is_teacher%',
  'Code now publication verifies the teacher role server-side'
);

select * from finish();
rollback;
