---
description: "List what to buy per warehouse after open sales and incoming purchases, with the supplier and lead time."
---

# replenishment

List what to buy per warehouse after open sales and incoming purchases, with the supplier and lead time.

Run `npm run erp -- replenishment`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Before suggesting a purchase, run /rebalance: stock sitting in the other branch is cheaper than a new order.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
