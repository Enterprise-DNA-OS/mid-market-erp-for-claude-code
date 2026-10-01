---
description: "List tasks forecast to finish over budget, worst first."
---

# cost-to-complete

List tasks forecast to finish over budget, worst first.

Run `npm run erp -- cost-to-complete`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Explain each overrun from the cost lines (/project). Ask the operator whether percent complete is current before calling it a loss.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
