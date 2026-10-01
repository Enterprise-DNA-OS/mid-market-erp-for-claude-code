---
description: "Move stock from one warehouse to another."
---

# transfer

Move stock from one warehouse to another.

Run `npm run erp -- transfer <item> <from warehouse> <to warehouse> <quantity> --event=<transfer ref>`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Check /rebalance first. Record it once the stock has actually left.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
