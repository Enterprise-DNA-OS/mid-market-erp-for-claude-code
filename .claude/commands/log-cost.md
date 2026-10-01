---
description: "Record a cost against a project task: labour, materials, subcontract, equipment or other."
---

# log-cost

Record a cost against a project task: labour, materials, subcontract, equipment or other.

Run `npm run erp -- log-cost <project> <task> <category> <amount> "note" --event=<timesheet or bill ref> [--on=YYYY-MM-DD]`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Amounts exclude GST. Use the source document as the event.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
