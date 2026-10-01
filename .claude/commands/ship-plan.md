---
description: "List every open sales line by due date with the stock in its warehouse and any shortage."
---

# ship-plan

List every open sales line by due date with the stock in its warehouse and any shortage.

Run `npm run erp -- ship-plan`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Lead with late lines that are short. For each shortage, check /rebalance and /supplier-chase before saying when it can ship.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
