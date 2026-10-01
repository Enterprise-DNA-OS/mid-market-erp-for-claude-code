# Mid-Market ERP for Claude Code

Orders, stock across branches, projects, progress claims and subcontractor retentions in a database you own. A free, open-source operations base for NZ and AU businesses that sell from more than one warehouse and deliver projects: distributors who install, building services firms, equipment suppliers with a project arm. MIT licensed. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free. Clone, run the demo, import your MYOB Acumatica exports. | Your fields, rules, MYOB Acumatica data brought across, a web front end or a different stack. | Installed, connected and operated through Omni by Enterprise DNA. Setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=myob-acumatica&utm_medium=customise) | [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=myob-acumatica&utm_medium=managed) |

## What you pay for now

MYOB does not publish a price for MYOB Acumatica. It is sold through MYOB partners: a monthly subscription per named user, priced by edition and the type of user, plus a partner implementation project and a support plan quoted separately. Ask your partner for the per-user rate, the user count and the implementation invoice, and you have your annual bill.

## The weekly routine

Monday: what is late, what can ship and which projects are ahead of their claims. Midweek: move stock between branches before buying more, chase late suppliers, log site costs. Month end: claim earned work, report retention money to subcontractors, chase overdue customers. The base records branches, warehouses, customers, suppliers and subcontractors, items, sales and purchase orders with partial receipts and dispatches, transfers, project tasks with budgets and percent complete, cost lines, progress claims, retentions, ledger balance snapshots, document evidence and change history. The general ledger, GST returns and payroll stay in your accounting system.

The demo business, Kauri Climate Demo, is fictional: an Auckland and Wellington heating and ventilation supplier that also installs on commercial jobs. It has a late order short of a heat pump, fan coils sitting in the wrong branch, a fit-out project 65,000 ahead of its claims and forecast over budget, a quiet school project, two retentions overdue for a report to the subcontractor and a customer over their credit limit.

## Quick start

Node 20 or later on Windows, macOS or Linux. No database server needed for the demo:

```bash
git clone https://github.com/Enterprise-DNA-OS/mid-market-erp-for-claude-code.git
cd mid-market-erp-for-claude-code
npm install
npm run demo
npm test
npm run view
npm run docs
```

Open the folder in your coding agent and ask "Which projects have work we have not claimed?" or run `/weekly-review`.

For real records, use a fresh `DATA_DIR` (or set `DATABASE_URL` to your own Postgres or Supabase), run `npm run migrate`, then `setup` and `import`. Never seed a real database. The embedded PGlite database serves one process at a time; a shared team setup needs Postgres with scoped access, TLS and tested backups.

## Commands

61 CLI commands, each with human tables or `--json`, and 63 slash commands: one per CLI command plus /customise and /new-view. [Arguments and how each number is worked out](docs/cli.md).

| Command | What it does |
|---|---|
| /settings | Show the business name, country, currency, GST number, record retention and last backup. |
| /branches | List branches with their warehouse count and active projects. |
| /warehouses | List warehouses and the branch each belongs to. |
| /customers | List customers with contact details, tax ID, credit limit and payment terms. |
| /vendors | List suppliers and subcontractors with lead times. |
| /items | List stock items with unit, cost, price, reorder point and preferred supplier. |
| /sales-orders | List sales orders by due date with branch, warehouse, project and open value. |
| /purchase-orders | List purchase orders by due date with the project they are bought for. |
| /stock | Show on hand, committed to open sales, available and incoming for every item in every warehouse. |
| /replenishment | List what to buy per warehouse after open sales and incoming purchases, with the supplier and lead time. |
| /rebalance | Find items short in one warehouse while the other holds more than its reorder point, and how many to move. |
| /ship-plan | List every open sales line by due date with the stock in its warehouse and any shortage. |
| /supplier-chase | List purchase orders due within a week or already late, with days late and the project they feed. |
| /projects | List projects with contract value, budget, actual, committed and forecast cost, and forecast margin. |
| /tasks | List every project task with percent complete, budget, actual, committed and forecast cost, and earned revenue. |
| /cost-to-complete | List tasks forecast to finish over budget, worst first. |
| /wip | Compare work earned with work claimed on each open project: under-claimed means money not yet asked for. |
| /claims-due | List active projects with unclaimed work and no claim for 30 days. |
| /claims | List every progress claim with earned to date, this claim, retention, net amount and status. |
| /retentions | List retention money held from subcontractors with its state: held, first report due, report due, release overdue or released. |
| /receivables | List what customers owe from the ledger, aged current, 1-30, 31-60 and 60+. |
| /payables | List what we owe suppliers from the ledger, with days overdue. |
| /credit-hold | List customers whose ledger balance plus open orders exceeds their credit limit. |
| /margins | Show shipped value, shipped margin and open value by branch. |
| /attention | List what has gone wrong or quiet: overdue or quiet orders, unreleased drafts, projects over forecast or quiet, unreported retentions and overdue invoices. |
| /records | List the document evidence register with retention dates and archive references. |
| /movements | Show every stock movement: receipts, shipments, transfers and adjustments. |
| /activity | Show the follow-up notes logged against orders and projects. |
| /audit | Show the change history of every write made through the CLI. |
| /help | List every CLI command and open the guide. |
| /compliance | Check the records against the NZ and AU rules in docs/compliance.md: record retention, GST invoice details, NZ retention money, and house rules. |
| /weekly-review | Write the Monday plan from three live reads: attention, ship plan and work in progress. |
| /month-end | Run the month-end close checklist: claims due, work in progress, cost overruns, retention reports, overdue customers and late suppliers. |
| /order | Show one order with its lines and follow-up notes. |
| /project | Show one project: position, tasks, cost lines, claims and notes. |
| /setup | Set the business name, country, currency, GST number or ABN, record retention and backup evidence, once per database. |
| /add | Add a branch, warehouse, customer, vendor, item, project, task, order, retention, invoice or record. |
| /set | Change allowed fields on an existing record. |
| /line | Add a line to a draft order. |
| /release | Release a draft order so it counts as committed stock or incoming supply. |
| /cancel-order | Cancel an order that has not been received or shipped against. |
| /receive | Record goods physically received against a purchase order line. |
| /ship | Record goods physically dispatched against a sales order line. |
| /transfer | Move stock from one warehouse to another. |
| /adjust-stock | Record a stock count difference with its reason. |
| /log-cost | Record a cost against a project task: labour, materials, subcontract, equipment or other. |
| /progress | Update a task's percent complete. |
| /claim | Create the next progress claim for a project from work earned since the last one, with contract retention taken off. |
| /issue-claim | Mark a draft claim issued once the tax invoice is raised in the ledger. |
| /claim-paid | Mark an issued claim paid with the ledger evidence. |
| /report-retention | Record that the retention money report went to the subcontractor. |
| /release-retention | Record retention money released to the subcontractor. |
| /invoice-balance | Copy an invoice balance verified in the accounting ledger. |
| /log | Record a factual follow-up note on an order or project. |
| /complete-project | Close a project with no open orders left. |
| /draft-order | Draft a sales order confirmation to the customer into drafts/. |
| /draft-chase | Draft a supplier follow-up for a late or due purchase order into drafts/. |
| /draft-statement | Draft a statement letter to a customer listing their outstanding invoices into drafts/. |
| /draft-retention-report | Draft the retention money report for a subcontractor into drafts/. |
| /import | Bring records across from MYOB Acumatica CSV exports. |
| /export | Write a complete snapshot of every table to a JSON file. |
| /customise | Add a field, rename a status, change a rule or add a report in plain language, with a migration and a test. |
| /new-view | Add a read-only HTML view from a plain-language description. |

## Ten questions the standard screens do not answer

Each one runs on the demo today and is a query you can change.

1. Which projects have work done that we have not claimed yet, and how much? `npm run erp -- wip`
2. Which tasks will finish over budget at the rate costs are running? `npm run erp -- cost-to-complete`
3. What stock can one branch send the other instead of buying more? `npm run erp -- rebalance`
4. Which late sales orders are short of stock in their own warehouse? `npm run erp -- ship-plan`
5. Which retention money is overdue for a report to the subcontractor? `npm run erp -- retentions`
6. Which customers are over their credit limit once open orders are counted? `npm run erp -- credit-hold`
7. Which active projects have gone a month without a claim? `npm run erp -- claims-due`
8. What have we shipped, at what margin, by branch? `npm run erp -- margins`
9. What is left for month end before the accountant closes the books? `npm run erp -- month-end`
10. Which invoices over $1,000 are missing the buyer details GST needs? `npm run erp -- compliance`

## Your first hour: ten things to ask for

1. Put our name, logo and colours on the progress claim.
2. Set up our branches and warehouses with the codes we use now.
3. Do a test run of the import with our customer and item exports.
4. Load our opening stock count for each warehouse.
5. Show me which projects are ahead of their claims.
6. Draft this month's claim for our biggest project.
7. Draft the retention report for each subcontractor we hold money for.
8. Tell me what Wellington can send Auckland this week.
9. Add a site supervisor field to projects.
10. Make a Monday view for the operations manager.

## Documents and views

Edit `brand.json` once. `npm run docs` writes progress claims, purchase orders, sales confirmations, retention money statements and project cost reports to `docs-out/`, one HTML file per record, ready to print to PDF. `npm run view` writes the week, branches and money views to `views/`. Nothing sends.

## Bring your history

[The MYOB Acumatica guide](docs/replace-myob-acumatica.md) covers Export to Excel from each list screen, the columns read, the test run, what maps and what stays behind. `npm run erp -- import myob-acumatica bundle exports --date-order=dmy --apply` loads every file in one transaction; a failed row keeps nothing. Open quantities only, so nothing ships twice.

## Controls and scope

Receipts and dispatches cannot exceed the open line. Stock cannot go negative in any warehouse. Unique event references stop a retry from doubling a receipt, transfer or cost. Claims are worked out from percent complete and never exceed what is earned. Every write is one transaction with an audit row.

[Record checks](docs/compliance.md) cover NZ and AU record retention, GST invoice details, NZ retention money trust and reporting, and house rules, each with its source. They check recorded evidence, not legal compliance. [Why no front end](docs/why-no-front-end.md) says honestly what a screen gives that this does not.

This is the operations side of an ERP, not the general ledger, bank feeds, GST filing, payroll or manufacturing planning, and it does not claim parity with MYOB Acumatica.

## Verification

`npm test` builds a temporary database, migrates and seeds it, runs all 61 CLI commands, and checks stock, transfer, project cost, claim and retention arithmetic, duplicate events, rollback, ambiguous names, the import, drafts and branded HTML. CI runs it on Windows, Linux and a real Postgres.

## Licence

MIT. Built by Enterprise DNA. Not affiliated with MYOB, Acumatica or Anthropic. [Omni by Enterprise DNA](https://enterprisedna.co/omni/instead-of/myob-acumatica?utm_source=github&utm_campaign=myob-acumatica&utm_medium=readme) installs, customises and runs your version. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=myob-acumatica&utm_medium=readme).
