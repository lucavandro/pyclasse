# PyClasse project instructions

This directory is a local mirror of the ChatGPT project “Laboratorio Online”.

## Synced reference material

- Treat every file under `sources/` as read-only reference material.
- Do not edit, rename, move, or delete synced project files.
- These files may be replaced the next time a task is created from this ChatGPT project.

## Product principles

- Keep the teacher and student experiences clearly separated. Do not expose teacher-only controls, class-wide personal data, administration links, or aggregate student information in the student interface unless explicitly required.
- Read application data from Supabase. Mock or demonstration data belongs only in the local development seed and must never be embedded in production UI components.
- Preserve accessibility: semantic controls, visible keyboard focus, useful labels, keyboard navigation, and sufficient contrast are required for new or changed interfaces.

## Privacy and GDPR

- Every change must preserve the privacy-by-default approach documented in `docs/PRIVACY_AND_DATA_PROTECTION.md`.
- Minimize collected and displayed personal data. Do not add tracking, analytics, telemetry, external AI processing, or third-party requests by default.
- Any optional transfer to a third party requires prior, specific and informed opt-in consent, a way to withdraw it, and an auditable timestamp when appropriate.
- Never use real personal data in tests, examples, screenshots, seeds, or documentation. Use the reserved `pyclasse.test` accounts for local fixtures.
- Document new personal-data fields, purposes, retention implications, processors, exports, and deletion behavior before considering the feature complete.
- Do not describe the application as legally certified or guarantee GDPR compliance. Record technical safeguards and flag decisions that still require assessment by the deployer or data controller.

## Security

- Never commit secrets, service-role keys, production credentials, access tokens, private user data, or sensitive logs. Public Supabase client settings are not a substitute for Row Level Security.
- Enable and maintain RLS on every application table. Enforce authorization, ownership, prerequisite rules, and role separation in PostgreSQL policies or trusted database functions as well as in the interface.
- Add schema and policy changes through new, forward-only Supabase migrations. Keep clean installations and upgrades equivalent and update the local seed when the development dataset needs the new schema.
- Validate untrusted input at the relevant boundary. Keep external resources HTTPS-only, render Markdown without raw HTML, and preserve safe attributes on links opened in a new tab.
- Preserve security headers and least privilege in Docker, CI, Supabase grants, and deployment configuration.

## Tests and verification

- Every operation, whether functional or visual, must be properly documented and tested before it is considered complete. Any change must include the relevant documentation updates and the minimum required automated regression coverage.
- Every behavior change requires automated regression coverage at the lowest useful level. Add unit tests for domain logic, contract tests for important source/configuration guarantees, pgTAP tests for database behavior, and E2E tests for critical user flows.
- For database changes, recreate Supabase from migrations and seed, then run `npm run test:db`. A migration that works only against an existing developer database is incomplete.
- Before handing off a material change, run `npm run check`. Run `npm run test:e2e` when authentication, navigation, persistence, permissions, realtime behavior, or visible user workflows change.
- For visual changes, verify the rendered application at representative desktop and mobile widths. Check expanded and collapsed navigation when relevant.
- Do not hide failing tests, weaken assertions, disable security checks, or silence runtime overlays to make a change appear successful.
- After every modification, create a commit with an automatically generated conventional commit message that describes the change and its validation.

## Docker and local development

- Keep `docker compose` usable without manual application configuration for local development. Supabase migrations and `supabase/seed.sql` must provide a complete, reproducible test environment.
- Keep local-only credentials documented in `docs/LOCAL_DEVELOPMENT_DATA.md` and clearly distinguish them from deployment secrets.
- Use supported runtime versions, non-root containers, deterministic dependency installation, health-aware startup, and only the ports required by the local workflow.

## Interface and style

- Follow `docs/STYLE_GUIDE.md` and the Dracula-based design system.
- Use centralized CSS custom properties for colors, typography, spacing, radii, shadows, borders, and motion. Do not add hard-coded visual values in component-specific styles when an existing token fits; add a documented token when a reusable value is missing.
- Keep interfaces professional, minimal, responsive, and role-appropriate. Prefer clear hierarchy and spacing over decorative containers or dense control groups.
- Reuse existing components and interaction patterns before adding visually equivalent variants.

## Code quality

- Keep TypeScript types explicit at data and component boundaries. Prefer small, named domain helpers over duplicated conditional logic in UI components.
- Write comments for security constraints, non-obvious business rules, and architectural decisions; do not narrate self-explanatory code.
- Preserve user changes in a dirty worktree and avoid unrelated rewrites. Do not edit generated or vendored files when the source or generation process can be changed instead.
- Remove obsolete code only after confirming it is unused and covered behavior remains intact.

## Documentation and publication

- Keep the root README concise and suitable for GitHub. Put detailed material in the relevant document under `docs/` and link to it rather than duplicating it.
- Update documentation in the same change whenever setup, environment variables, permissions, privacy behavior, database schema, local credentials, user flows, or styling conventions change.
- Keep `README.md`, installation instructions, architecture, security, privacy, contributing guidance, style guide, local data documentation, and license mutually consistent.
- Before publication, ensure examples contain no secrets or personal data, internal-only artifacts are ignored, links and commands are current, and the documented license terms match the repository license file.
