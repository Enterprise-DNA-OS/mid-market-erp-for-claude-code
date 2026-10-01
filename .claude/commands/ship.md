---
description: "Record goods physically dispatched against a sales order line."
---

# ship

Record goods physically dispatched against a sales order line.

Run `npm run erp -- ship <order> <line no> <quantity> --event=<dispatch ref>`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Stock in that warehouse cannot go negative. Use the dispatch reference as the event.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
