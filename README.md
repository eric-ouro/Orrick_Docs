# Blind Pool Fund Term Sheet Workspace

Interactive tracker for reviewing fund term sheets against open-items memos. The app now supports Supabase login, shared projects, permanent issue edits, and an issue activity trail.

## Open the App

Open:

`/Users/eholmdahl/GitHub/Orrick_Docs/index.html`

With `config.js` populated, the page signs users in with Supabase and stores edits in Postgres. If Supabase config is missing, the page offers a local fallback that uses browser storage.

## Supabase

Project ref:

`leafothtfmiozfxywmfx`

Schema and RLS policies live in:

`supabase/migrations/20260703173000_initial_collaboration_schema.sql`

The migration has been pushed to the remote project. To check it:

```bash
supabase migration list
```

Frontend config lives in:

`config.js`

Only use the public publishable/anon key in `config.js`. Never put a service-role key in browser code.

## First Project

1. Open the app.
2. Create or sign into a Supabase account.
3. Click `Seed Current Docs`.

That creates a database-backed project from `data/seed-data.js`, including documents, sections, issues, links, initial issue states, and future audit events.

## Seeded Sources

- `sources/FORM - Venture Capital_Private Equity Fund Form Term Sheet.docx`
- `sources/blind_pool_fund_open_items_and_drafting_changes.docx`
- Shared ChatGPT URL is recorded in `data/seed-data.json`; the attached open-items memo is the structured source used for the first seed.

## Regenerate Seed Data

If the source `.docx` files are replaced, regenerate the browser data with:

```bash
/Users/eholmdahl/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/eholmdahl/GitHub/Orrick_Docs/scripts/extract_documents.py
```

Generated files:

- `data/seed-data.json`
- `data/seed-data.js`
