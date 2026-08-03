begin;

select plan(45);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'app_settings', 'app_settings table exists');
select has_table('public', 'classes', 'classes table exists');
select has_table('public', 'class_members', 'class_members table exists');
select has_table('public', 'exercises', 'exercises table exists');
select has_table('public', 'class_assignments', 'class_assignments table exists');
select has_table('public', 'tests', 'tests table exists');
select has_table('public', 'submissions', 'submissions table exists');

select ok(
  (select bool_and(c.relrowsecurity)
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any(array[
       'profiles', 'app_settings', 'classes', 'class_members', 'exercises',
       'class_assignments', 'tests', 'submissions'
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
select has_column('public', 'app_settings', 'login_title_it', 'settings store the Italian login title');
select has_column('public', 'app_settings', 'login_subtitle_it', 'settings store the Italian login subtitle');
select has_column('public', 'app_settings', 'login_title_en', 'settings store the English login title');
select has_column('public', 'app_settings', 'login_subtitle_en', 'settings store the English login subtitle');
select has_function('public', 'get_public_branding', array[]::text[], 'public branding function exists');
select ok(
  has_function_privilege('anon', 'public.get_public_branding()', 'EXECUTE'),
  'anonymous users can read only public login branding through the function'
);
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

select * from finish();
rollback;
