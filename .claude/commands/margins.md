---
description: "Show shipped value, shipped margin and open value by branch."
---

# margins

Show shipped value, shipped margin and open value by branch.

Run `npm run erp -- margins`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Margin uses the cost frozen on each order line when it was entered, not an accounting valuation.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
