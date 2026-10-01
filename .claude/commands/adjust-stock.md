---
description: "Record a stock count difference with its reason."
---

# adjust-stock

Record a stock count difference with its reason.

Run `npm run erp -- adjust-stock <item> <warehouse> <+/-quantity> "reason" --event=<count sheet>`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Read /stock first. A reason and count reference are required.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
