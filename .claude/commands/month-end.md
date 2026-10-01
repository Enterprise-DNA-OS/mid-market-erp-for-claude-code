---
description: "Run the month-end close checklist: claims due, work in progress, cost overruns, retention reports, overdue customers and late suppliers."
---

# month-end

Run the month-end close checklist: claims due, work in progress, cost overruns, retention reports, overdue customers and late suppliers.

Run `npm run erp -- month-end`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Turn each non-empty section into a to-do with the command that clears it (/claim, /draft-retention-report, /draft-statement, /draft-chase). The ledger close itself stays with the accountant.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
