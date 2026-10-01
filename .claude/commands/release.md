---
description: "Release a draft order so it counts as committed stock or incoming supply."
---

# release

Release a draft order so it counts as committed stock or incoming supply.

Run `npm run erp -- release <order>`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Confirm partner, lines and due date with the operator first. Release does not send anything.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
