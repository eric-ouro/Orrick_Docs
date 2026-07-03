# Supabase Data Model

Project ref: `leafothtfmiozfxywmfx`

The app uses Supabase for login, shared project data, permanent issue edits, and an audit trail.

## Tables

- `profiles`: public profile row for each Supabase Auth user.
- `projects`: top-level configurable review workspace.
- `project_members`: user access per project, with `owner`, `editor`, and `viewer` roles.
- `documents`: each source document in a project, such as a term sheet or open-items memo.
- `document_sections`: extracted document portions that issues can link to.
- `issues`: canonical questions, decisions, drafting changes, checklist items, and supporting-document tasks.
- `issue_sections`: many-to-many links from issues to relevant document sections.
- `issue_states`: current collaborative answer/status/change fields for each issue.
- `issue_events`: immutable audit trail for issue-state inserts and updates.

## Apply Schema

If the CLI is linked and has the database password:

```bash
supabase link --project-ref leafothtfmiozfxywmfx
supabase db push
```

If you prefer the dashboard, paste `migrations/20260703173000_initial_collaboration_schema.sql` into the Supabase SQL editor and run it.

## Frontend Config

The frontend expects:

```js
window.ORRICK_SUPABASE_CONFIG = {
  projectRef: "leafothtfmiozfxywmfx",
  url: "https://leafothtfmiozfxywmfx.supabase.co",
  anonKey: "..."
};
```

`anonKey` is public client configuration, not a service-role secret. Do not put a service-role key in the browser.

## Seeding

After logging into the app, use `Seed Current Docs` to create a Supabase project from `data/seed-data.js`. This makes the project, documents, sections, issues, issue-section links, and initial issue states in the database.
