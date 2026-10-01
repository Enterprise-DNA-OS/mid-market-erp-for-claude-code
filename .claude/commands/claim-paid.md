---
description: "Mark an issued claim paid with the ledger evidence."
---

# claim-paid

Mark an issued claim paid with the ledger evidence.

Run `npm run erp -- claim-paid <claim> "remittance or ledger ref"`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Only after the payment shows in the accounting ledger.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
