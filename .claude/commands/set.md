---
description: "Change allowed fields on an existing record."
---

# set

Change allowed fields on an existing record.

Run `npm run erp -- set <entity> <code> --field=value`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Read the record first and show before and after. Closed orders and completed projects cannot be changed.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
