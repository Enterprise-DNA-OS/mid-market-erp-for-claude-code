---
description: "Cancel an order that has not been received or shipped against."
---

# cancel-order

Cancel an order that has not been received or shipped against.

Run `npm run erp -- cancel-order <order> "reason"`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

A reason is required. Partly fulfilled orders cannot be cancelled.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
