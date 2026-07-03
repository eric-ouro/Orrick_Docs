# Blind Pool Fund Term Sheet Workspace

Interactive tracker for reviewing fund term sheets against open-items memos. The app now supports Supabase login, shared projects, permanent issue edits, and an issue activity trail.

## Open the App

Open:

`/Users/eholmdahl/GitHub/Orrick_Docs/index.html`

With `config.js` populated, the page signs users in with Supabase and stores edits in Postgres. If Supabase config is missing, the page offers a local fallback that uses browser storage.

## Local Development

Install dependencies once:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

The AI follow-up panel uses a Vercel serverless function. For local AI testing, run through Vercel instead of plain Vite:

```bash
OPENAI_API_KEY=your_openai_key ANTHROPIC_API_KEY=your_anthropic_key vercel dev
```

Build the static deploy output:

```bash
npm run build
```

The build output goes to `dist/`.

## Vercel Deployment

This repo includes `vercel.json`, which tells Vercel to run `npm run build` and serve `dist/`.

CLI path:

```bash
npm install -g vercel
vercel login
vercel --prod
```

GitHub path:

1. Push this repo to GitHub.
2. In Vercel, choose `Add New Project`.
3. Import the GitHub repo.
4. Leave the detected build command as `npm run build`.
5. Leave the output directory as `dist`.
6. Deploy.

The app uses the public Supabase publishable key in `config.js`. The AI follow-up panel also uses server-side Vercel environment variables:

- `OPENAI_API_KEY`: required for the OpenAI button in `/api/ask-section`
- `OPENAI_MODEL`: optional; defaults to `gpt-5.5`
- `ANTHROPIC_API_KEY`: required for the Claude button in `/api/ask-section`
- `ANTHROPIC_MODEL`: optional; defaults to `claude-sonnet-5`

Do not put OpenAI or Anthropic API keys in `config.js` or any browser file.

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

## Project Access

Projects are visible only to project members. Owners can click `Share`, invite another user by email, and assign a role:

- `viewer`: can see the project and all associated documents, issues, answers, and activity.
- `editor`: can also update answers, issue status, drafting notes, and follow-up flags.
- `owner`: can manage project membership.

The invited person needs to create or sign into an account once before they can be added by email.

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

Static document and section summaries are reapplied with:

```bash
npm run summaries
```
