---
description: "Mark a draft claim issued once the tax invoice is raised in the ledger."
---

# issue-claim

Mark a draft claim issued once the tax invoice is raised in the ledger.

Run `npm run erp -- issue-claim <claim> --ledger-ref=<invoice number> [--issued-on=] [--due-on=]`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Due date defaults to the customer's payment terms.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
