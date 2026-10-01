---
description: "Set the business name, country, currency, GST number or ABN, record retention and backup evidence, once per database."
---

# setup

Set the business name, country, currency, GST number or ABN, record retention and backup evidence, once per database.

Run `npm run erp -- setup --name="Your business" --country=NZ --currency=NZD --tax-number=123-456-789 --retention-years=7`. Add `--json` when you need to analyse the result further. Names match case-insensitively and IDs by prefix; if a name is ambiguous, list the candidates and ask.

Country and currency cannot change later. Back up first when changing an existing database.

Never send, pay or delete anything. Arguments in full: docs/cli.md.
