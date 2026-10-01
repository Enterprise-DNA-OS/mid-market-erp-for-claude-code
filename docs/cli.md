# CLI reference

Run `npm run erp -- help`. Every command accepts `--json`. Codes match exactly ignoring case, names by any part, IDs by prefix. An ambiguous match lists the candidates and exits 1. Unknown options fail. Dates are YYYY-MM-DD. One business, one country and one currency per database. Order, project and claim amounts exclude GST; invoice totals are ledger snapshots including GST.

## Start

`npm run migrate` creates an empty database. Then:

```bash
npm run erp -- setup --name="Your business" --country=NZ --currency=NZD --tax-number=123-456-789 --retention-years=7
```

AU uses `--country=AU --currency=AUD` and your ABN as the tax number. Setup can later change the name, tax number, retention and backup evidence (`--last-backup=YYYY-MM-DD --backup-ref="..."`), never the country or currency.

## Reads

No arguments: settings, branches, warehouses, customers, vendors, items, sales-orders, purchase-orders, stock, replenishment, rebalance, ship-plan, supplier-chase, projects, tasks, cost-to-complete, wip, claims-due, claims, retentions, receivables, payables, credit-hold, margins, attention, records, movements, activity, audit, compliance.

With a record: `order <code>` (lines and notes), `project <code>` (tasks, costs, claims, notes).

Reviews: `weekly-review` returns attention, ship plan and work in progress. `month-end` returns claims due, work in progress, cost overruns, retentions needing action, overdue customers and late suppliers.

## How the numbers work

- **Stock.** On hand is the sum of movements per item and warehouse. Committed is the open quantity on released sales orders. Incoming is the open quantity on released purchase orders. Available is on hand minus committed.
- **Replenishment** per warehouse = max(reorder point minus on hand plus committed minus incoming, 0).
- **Rebalance** pairs a warehouse below its reorder point (after commitments and incoming) with another holding more than its own reorder point. Move quantity is the smaller of the shortfall and the surplus.
- **Ship plan** compares each open sales line with stock in its own warehouse. It does not allocate stock between orders: ship in due-date order and re-read.
- **Project cost.** Actual cost is logged costs plus receipts on purchase orders tied to a task. Committed cost is the open value of those purchase orders. Forecast cost per task is actual cost divided by percent complete; a task at 0 per cent uses its budget.
- **Earned revenue** per task is revenue budget times percent complete. **Work in progress** is earned revenue minus issued claims: positive means work done and not yet claimed.
- **Claims.** `claim` takes earned to date minus everything already claimed, and retention at the project's rate. The tax invoice is raised in the ledger, then `issue-claim` records its number.
- **Margins** use the cost frozen on each order line when it was entered. They are not an inventory valuation.

## Add records

`add <entity> --field=value`. Hyphens for compound names. Relationships accept codes, names or ID prefixes. Required fields marked *.

| Entity | Fields |
|---|---|
| branch | code*, name* |
| warehouse | code*, name*, branch-id* |
| customer | code*, name*, email, phone, address, tax-id, credit-limit, terms-days |
| vendor | code*, name*, email, lead-days, subcontractor (true/false) |
| item | code*, name*, uom, unit-cost, unit-price, reorder-point, vendor-id |
| project | code*, name*, customer-id*, branch-id*, manager, start-on*, end-on*, contract-value, retention-pct |
| task | project-id*, code*, name*, budget-cost, budget-revenue |
| order | code*, kind* (sales/purchase), customer-id* or vendor-id*, warehouse-id*, project-id, task-id, due-on*, reference |
| retention | code*, project-id*, vendor-id*, withheld-on*, amount*, release-due*, trust-ref |
| invoice | code*, kind* (receivable/payable), customer-id* or vendor-id*, project-id, issued-on*, due-on*, total*, paid, ledger-ref* |
| record | name*, reference*, prepared-on*, completed-on*, period-end*, retain-until*, source-ref |

New orders are drafts. A sales order on a project must be for that project's customer. A task on an order needs its project.

`set <entity> <code> --field=value` changes allowed fields and records before and after in the audit table.

## Transactions

```bash
npm run erp -- line PO-2003 FCU-2 4 900 1                 # draft order, item, quantity, unit price, line number
npm run erp -- release PO-2003
npm run erp -- receive PO-2002 1 5 --event=DOCKET-8812   # receipts on a project order post cost to its task
npm run erp -- ship SO-1001 1 3 --event=DISPATCH-311
npm run erp -- transfer FCU-2 WLG-MAIN AKL-MAIN 8 --event=TR-0042
npm run erp -- adjust-stock CTRL-W WLG-MAIN -1 "Damaged, count sheet 4" --event=COUNT-4
npm run erp -- cancel-order PO-2003 "Ordered by phone instead"
npm run erp -- log-cost P200 T10 labour 2500 "Duct crew week 3" --event=TS-3 --on=2026-09-30
npm run erp -- progress P200 T10 40
npm run erp -- claim P100 --period-end=2026-09-30
npm run erp -- issue-claim PC-P100-2 --ledger-ref=INV-2010
npm run erp -- claim-paid PC-P100-1 "Remittance 4471"
npm run erp -- report-retention RT-101
npm run erp -- release-retention RT-100
npm run erp -- invoice-balance INV-2002 4600 "Remittance 4480"
npm run erp -- log P200 "School asked for weekend access only"
npm run erp -- complete-project P300
```

`--event` is the source document reference. It is unique, so a retry never records the same receipt, shipment, transfer or cost twice. Every write runs in one transaction and lands in the audit table.

## Drafts, documents and views

- `draft-order <sales order>`, `draft-chase <purchase order>`, `draft-statement <customer>`, `draft-retention-report <subcontractor>` write Markdown to `drafts/`. Nothing sends.
- `npm run docs` renders progress claims, purchase orders, sales confirmations, retention statements and project cost reports to `docs-out/` in the brand from `brand.json`. `npm run docs -- progress-claim` renders one type.
- `npm run view` renders the week, branches and money views to `views/`.

## Move and back up

- `import myob-acumatica <type|bundle> <file|folder> [--date-order=dmy] [--warehouse=] [--branch=] [--apply]`: see docs/replace-myob-acumatica.md.
- `export <file>` writes every table to JSON. It refuses to overwrite a file.
