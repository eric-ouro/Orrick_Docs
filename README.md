# Blind Pool Fund Term Sheet Workspace

Local interactive tracker for reviewing the Orrick fund term sheet against the blind-pool fund open-items memo.

## Open the App

Open:

`/Users/eholmdahl/GitHub/Orrick_Docs/index.html`

The app is static and stores working answers in the browser's local storage. Use `Export` to download the working answer layer as JSON, and `Import` to restore or share it.

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
