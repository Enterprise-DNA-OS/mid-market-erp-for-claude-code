---
description: "List projects with contract value, budget, actual, committed and forecast cost, and forecast margin."
---

# projects

List projects with contract value, budget, actual, committed and forecast cost, and forecast margin.

Run `npm run erp -- projects`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Read only. Forecast cost scales actual cost by percent complete; tasks not started use budget.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
