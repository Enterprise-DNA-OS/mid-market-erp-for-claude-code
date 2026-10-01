---
description: "Add a line to a draft order."
---

# line

Add a line to a draft order.

Run `npm run erp -- line <order> <item> <quantity> <unit price> <line no>`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Quantities in the item's base unit. Prices exclude GST.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
