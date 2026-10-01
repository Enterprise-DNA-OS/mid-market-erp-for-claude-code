---
description: "Record goods physically received against a purchase order line."
---

# receive

Record goods physically received against a purchase order line.

Run `npm run erp -- receive <order> <line no> <quantity> --event=<delivery docket>`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Use the delivery docket as the event so a retry cannot double count. Receipts on a project purchase order post their cost to that task.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
