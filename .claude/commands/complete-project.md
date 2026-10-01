---
description: "Close a project with no open orders left."
---

# complete-project

Close a project with no open orders left.

Run `npm run erp -- complete-project <project>`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Check /claims and /retentions first: final claim issued, retention release dates known.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
