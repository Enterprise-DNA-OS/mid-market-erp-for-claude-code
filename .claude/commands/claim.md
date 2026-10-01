---
description: "Create the next progress claim for a project from work earned since the last one, with contract retention taken off."
---

# claim

Create the next progress claim for a project from work earned since the last one, with contract retention taken off.

Run `npm run erp -- claim <project> --period-end=YYYY-MM-DD`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Run /project first and confirm percent complete. The claim is a draft until /issue-claim; `npm run docs -- progress-claim` renders it.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
