---
description: "List customers whose ledger balance plus open orders exceeds their credit limit."
---

# credit-hold

List customers whose ledger balance plus open orders exceeds their credit limit.

Run `npm run erp -- credit-hold`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Say which open orders would push them further over. Holding an order is the operator's call.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
