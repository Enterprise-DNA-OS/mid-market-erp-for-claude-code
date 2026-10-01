# Mid-Market ERP for Claude Code

## Business context

Business: [your business]. Operator: [name and role]. One database holds one business, one country and one currency, across as many branches and warehouses as you run. What matters: orders shipped on time, stock in the right branch, project work claimed as it is earned, subcontractors' retention handled by the rules. Kauri Climate Demo is fictional.

## Routes

Read the matching .claude/commands recipe. Arguments and calculations: docs/cli.md.

| Job | Route |
|---|---|
| Start the day | /attention, /ship-plan, /supplier-chase |
| Monday plan | /weekly-review |
| Stock | /stock, /rebalance, /transfer, /replenishment, /adjust-stock, /movements |
| Buying | /purchase-orders, /add, /line, /release, /receive, /draft-chase |
| Selling and dispatch | /sales-orders, /order, /ship, /credit-hold, /draft-order |
| Projects | /projects, /project, /tasks, /log-cost, /progress, /cost-to-complete |
| Claiming | /wip, /claims-due, /claim, /issue-claim, /claim-paid, /claims |
| Subcontractor retention | /retentions, /draft-retention-report, /report-retention, /release-retention |
| Money | /receivables, /payables, /draft-statement, /invoice-balance, /margins |
| Month end | /month-end |
| Record checks | /compliance and docs/compliance.md |
| Reference data | /settings, /branches, /warehouses, /customers, /vendors, /items, /records, /activity, /audit |
| Change records | /add, /set, /cancel-order, /log, /complete-project |
| Paperwork and views | npm run docs, npm run view, /new-view |
| Move or tailor | /setup, /import, /export, /customise |

## Rules

Read fresh data before answering. Never invent receipts, shipments, counts, costs, percent complete, claims or ledger balances. List ambiguous candidates and ask. Nothing sends, pays, files GST or deletes. Drafts stay in drafts/. The ledger, bank, GST and payroll stay in the accounting system.

Percent complete comes from the project manager. Claims come from the claim command, never a hand-typed figure. Read docs/compliance.md before changing a record check; a clean check is not legal certification.

Use the CLI for writes. New questions are parameterised SQL in scripts/lib/domain.mjs. Schema changes are a new numbered migration; never edit one already applied. Export a backup and run npm test before real changes. Never seed a real database.

## Files

Schema: supabase/migrations. CLI: scripts/erp.mjs. Reports and checks: scripts/lib/domain.mjs. Import: scripts/lib/import.mjs. Brand: brand.json. Documents: documents.json. Views: views.json. Moving off MYOB Acumatica: docs/replace-myob-acumatica.md. Other agents read AGENTS.md.

Omni by Enterprise DNA installs, customises and runs this for you: https://enterprisedna.co/omni/instead-of/myob-acumatica
