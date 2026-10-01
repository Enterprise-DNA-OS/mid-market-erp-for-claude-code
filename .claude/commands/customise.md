---
description: "Make it yours: add a field, rename a status, change a rule or add a report in plain language. Writes the numbered migration, updates the CLI and tests, then applies it."
---

# customise

The operator describes the change in plain words, for example "add a site contact to projects", "retention on our contracts is 3 per cent, then 2 after practical completion", "show margin by salesperson".

1. Read CLAUDE.md, the command it touches in scripts/erp.mjs or scripts/lib/domain.mjs, and the schema in supabase/migrations.
2. Run `npm run erp -- export backups/before-<change>.json` first.
3. Write the change as the next numbered migration (`0002_<change>.sql`). Never edit a migration that has already run. Keep existing records and the audit table.
4. Update the CLI allowlists, reports, documents.json or views.json the change needs, and add a test for the new behaviour to scripts/smoke.mjs.
5. Run `npm test` (temporary data). When it passes, run `npm run migrate` on the real database.
6. For a rule that comes from law or a contract, add the source to docs/compliance.md.

Report: what changed, the migration file, and the command to see it working.
