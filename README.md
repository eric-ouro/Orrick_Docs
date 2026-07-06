# Blind Pool Fund Term Sheet Workspace

Interactive tracker for reviewing fund term sheets against open-items memos. The app supports Supabase login, shared projects, permanent issue edits, and an issue activity trail.

## Work Queue Structure

The seed data produces 105 issues from the two source documents, organized by topic:

- 8 immediate decisions (memo section 5)
- 6 requested drafting changes (memo section 4)
- 63 detailed questions (memo section 3, topics A-H)
- 5 gap-review questions (topics I-J): side letters/MFN, closing true-ups, recycling, in-kind distributions, and tax/ERISA accommodations
- 23 supporting documents (memo section 1)

Every decision, change, and question also carries a resolution tier tag:

- `high-level`: platform/business posture decisions made outside any one clause (entity architecture, regulatory path, who may solicit)
- `multi-clause`: decisions whose answer must land consistently across several clauses (waterfall structure, vehicle flexibility)
- `fill-in`: per-clause questions resolved primarily by electing bracketed options, but that still need judgment
- `addition-removal`: adding, rewriting, or deleting language

Questions that were purely "fill in this blank" (fund size, minimum commitment, fee rate, carry percentage, hurdle, catch-up, concentration limits, call notice periods, fund term, key persons, GP removal thresholds, giveback caps, audited financials, GP commitment funding forms, warehousing permission, successor-fund threshold, amendment consent threshold, and similar) are not issues at all: the clause-election editor replaces them, and their "how to decide" notes appear as guidance on the clause itself. The queue was audited to confirm no remaining question is merely a copy of a clause dropdown.

Gap topics that overlap memo questions (LPAC mandate, clawback mechanics, expense caps, borrowing scope, indemnification standards) are folded into the notes of the corresponding A-H questions instead of appearing as separate items.

Every question carries a curated set of linked term-sheet clauses (question-level, not category-level), a priority, and a short "how to decide" note shown in the detail panel. The memo's section 7 checklist is intentionally not extracted: every line duplicates a decision, question, or supporting document already in the queue.

The queue is grouped by topic, with Topic and Tier filters showing open-item counts.

## Clause Elections

The Orrick form expresses most drafting choices as brackets: blanks (`$[_____]`), pick-one option groups (`[fourth][fifth][sixth]`), and optional provisions to keep or omit. Clicking any clause in the document pane opens the clause-election editor in the right pane:

- each blank gets a text input, each option group radio cards (with write-in and omit choices), and each optional provision a keep/omit/write-in selector
- **nested brackets are handled recursively**: options and kept provisions that themselves contain further brackets (e.g. `[ …reduced by [0.25][0.1]… ][OR][ …reduced to [2.5][2.0]… ]`, or `[ …extend for [two] periods]`) reveal their sub-elections indented beneath the parent choice, and the progress count grows as those become active
- a live preview shows the clause with elections applied; unresolved brackets stay highlighted
- the clause can be accepted (only once every election is resolved), rejected, or sent to rewrite with requested language
- an **Ask About This Clause** AI panel (OpenAI or Claude) answers questions using the clause text, its elections, and guidance, and can save the response into the clause notes
- once a clause is settled, the **document pane fills in with the edited clause** (elections applied, drafting notes removed; rewrite text for rewrites; a rejected marker for rejections), with the original form language available under a disclosure toggle
- the Clauses metric tracks how many of the 30 bracketed clauses are settled

Elections persist to the `clause_states` table in Supabase (or browser storage in local mode). Guidance notes from the retired fill-in questions appear at the top of the editor for the relevant clause.

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
- `ANTHROPIC_MODEL`: optional; defaults to `claude-opus-4-8`

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
.venv/bin/python scripts/extract_documents.py
```

(One-time setup: `python3 -m venv .venv && .venv/bin/pip install python-docx`.)

Generated files:

- `data/seed-data.json`
- `data/seed-data.js`

Static document and section summaries are reapplied with:

```bash
npm run summaries
```

Curated question-to-clause assignments, priorities, and decision notes live in `QUESTION_CURATION`, `QUESTION_TIERS`, `REPLACED_BY_ELECTIONS`, `CLAUSE_GUIDANCE_EXTRA`, `GAP_QUESTIONS`, `DECISION_CURATION`, `CHANGE_CURATION`, and `SUPPORTING_DOC_CURATION` inside `scripts/extract_documents.py`. The extractor prints a warning for any memo question missing a curation or tier entry, so edits to the memo surface immediately on regeneration.

Run the headless render smoke test with:

```bash
npm test
```

After regenerating the seed, sync already-seeded Supabase projects (updates seeded issues in place, inserts new ones, removes retired ones, rebuilds clause links, and preserves user answers) by generating and pushing a data migration:

```bash
node scripts/generate_seed_sync_migration.mjs
supabase db push
```

Custom (user-created) issues are never touched by the sync.
