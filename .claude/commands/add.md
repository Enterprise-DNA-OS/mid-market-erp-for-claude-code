---
description: "Add a branch, warehouse, customer, vendor, item, project, task, order, retention, invoice or record."
---

# add

Add a branch, warehouse, customer, vendor, item, project, task, order, retention, invoice or record.

Run `npm run erp -- add <entity> --field=value`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Read docs/cli.md for the fields. List existing records first so you do not add a duplicate. New orders start as drafts.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
