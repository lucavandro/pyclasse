-- Markdown exercise briefs and optional external learning resources.
alter table public.exercises
  add column description_format text not null default 'markdown',
  add column resource_url text,
  add column resource_label text;

alter table public.exercises
  add constraint exercises_description_format_check check (description_format = 'markdown'),
  add constraint exercises_resource_url_check check (
    resource_url is null or resource_url ~ '^https://[^[:space:]]+$'
  ),
  add constraint exercises_resource_label_check check (
    resource_label is null or char_length(resource_label) between 1 and 120
  );

comment on column public.exercises.description is 'Exercise brief written in Markdown.';
comment on column public.exercises.resource_url is 'Optional HTTPS website or YouTube learning resource.';
