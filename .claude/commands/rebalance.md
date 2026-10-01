---
description: "Find items short in one warehouse while the other holds more than its reorder point, and how many to move."
---

# rebalance

Find items short in one warehouse while the other holds more than its reorder point, and how many to move.

Run `npm run erp -- rebalance`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Present each suggestion as a transfer the operator can approve, then record it with /transfer. Never move stock without a yes.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
