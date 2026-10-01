# Why there is no front end

MYOB Acumatica is an ERP: customers, suppliers, items, warehouses, orders, projects and the ledger, behind a set of screens. Underneath, the operational half is ordinary records and a handful of jobs repeated every week: ship what is due, buy what is short, claim what is earned, chase what is owed. Most of the subscription pays for the screens that let people who do not write queries reach those records.

This repo keeps the records and drops the screens. Open the folder in a coding agent, ask in plain words, and it runs the query and explains the answer. A question no report was built for still gets answered.

## What you gain

- **Your own questions.** "Which projects are ahead of their claims?" or "what can Wellington send Auckland instead of buying?" are one query each.
- **No seats.** Everyone who needs to look can look.
- **Records you own.** Plain Postgres tables. Back them up, query them from anything, leave whenever you like.
- **Your process, not the package's.** When the way you work changes, you add a command or a field. No partner change request.

## What a screen gives that this does not

- **Warehouse scanning.** Pickers with barcode scanners need a screen or a handheld app.
- **Phones on site.** Project managers logging progress from a site want a phone form, offline when there is no signal.
- **Drag and drop.** Scheduling boards and dispatch boards are easier to move around on a screen.
- **Live accounting.** The general ledger, bank feeds, GST returns and payroll stay in your accounting system. This holds operational records and copies ledger balances in with a reference.

Enterprise DNA builds whichever of these you need into your own version, on top of the same records.

Installed and run for you: https://enterprisedna.co/omni/instead-of/myob-acumatica
