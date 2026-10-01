---
description: "List purchase orders due within a week or already late, with days late and the project they feed."
---

# supplier-chase

List purchase orders due within a week or already late, with days late and the project they feed.

Run `npm run erp -- supplier-chase`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Offer /draft-chase for each late one. Do not promise dates on the supplier's behalf.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
