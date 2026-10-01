# Moving off MYOB Acumatica

This guide takes the operational records out of MYOB Acumatica and loads them here. Your accounting ledger stays where it is. Plan a day for a first pass, with the original files kept as your record of what was moved.

## 1. Export from MYOB Acumatica

In MYOB Acumatica, most list screens have an **Export to Excel** button on the toolbar. It exports the columns visible in the grid, so add any missing columns to the grid first (column configuration), then export. Open each file in Excel and **Save As CSV (UTF-8)**. Name the files as below and put them in one folder:

| File | Screen | Columns the import reads |
|---|---|---|
| customers.csv | Customers | Customer ID, Customer Name, Status, Email, Phone 1, Address Line 1, City, Tax Registration ID, Credit Limit |
| vendors.csv | Vendors | Vendor ID, Vendor Name, Status, Email, Vendor Class, Lead Time (Days) |
| stock-items.csv | Stock Items | Inventory ID, Description, Item Status, Base Unit, Default Price, Last Cost (or Average Cost), Reorder Point, Preferred Vendor |
| projects.csv | Projects | Project ID, Description, Customer, Status, Branch, Project Manager, Start Date, End Date, Contract Value (or Revenue Budget), Retainage (%) |
| project-tasks.csv | Project Tasks or a cost budget inquiry | Project ID, Task ID, Description, Cost Budget, Revenue Budget, Completed (%) |
| sales-orders.csv | Sales Orders | Order Nbr., Customer, Status, Requested On, Warehouse, Project, Customer Order Nbr. |
| sales-lines.csv | a sales order lines inquiry | Order Nbr., Line Nbr., Inventory ID, UOM, Open Qty., Unit Price |
| purchase-orders.csv | Purchase Orders | Order Nbr., Vendor, Status, Promised On, Warehouse, Project |
| purchase-lines.csv | a purchase order lines inquiry | Order Nbr., Line Nbr., Inventory ID, UOM, Open Qty., Unit Cost |

Line exports usually come from a generic inquiry. If your partner set one up, use it; otherwise ask them or build one with the columns above. Column names match without case. A heading your system renamed needs mapping: rename the column in Excel, or ask your coding agent to add the alternative name in `scripts/lib/import.mjs`.

Branches and warehouses are created first, by hand, with the same codes MYOB Acumatica uses:

```bash
npm run erp -- add branch --code=WLG --name="Wellington branch"
npm run erp -- add warehouse --code=WLG-MAIN --name="Wellington warehouse" --branch-id=WLG
```

## 2. Do a test run

```bash
npm run erp -- import myob-acumatica bundle exports --date-order=dmy
```

Without `--apply` nothing is kept: the whole batch runs inside a transaction and is rolled back, and you see counts of inserted, existing and skipped rows per file. NZ and AU users export dates day first, hence `--date-order=dmy`. `--warehouse=` and `--branch=` fill in a missing Warehouse or Branch column.

## 3. Apply

```bash
npm run erp -- import myob-acumatica bundle exports --date-order=dmy --apply
```

One transaction: if any row fails, nothing from any file is kept and the error names the file and row. Running the same files again inserts nothing.

## What maps

- Customers and vendors, with the full source row kept in `source_data`. A vendor whose class contains "subcontract" is marked as a subcontractor.
- Stock items, their base unit, price, cost, reorder point and preferred vendor.
- Projects, tasks, budgets and percent complete, so earned revenue and work in progress are right from day one.
- Open sales and purchase orders as drafts, with the open quantity on each line. Release each one after checking it.

## What does not come across

- **Inactive, completed and cancelled records** are skipped and counted.
- **Stock on hand.** Count it, then load the count with `adjust-stock` per item and warehouse, reason "Opening count". A count is more reliable than an export at a moment in time.
- **History already fulfilled.** Shipped and received quantities stay in your MYOB Acumatica archive; only open quantities load, so nothing ships twice.
- **The ledger.** Journals, bank, GST returns and payroll stay in your accounting system. Copy open customer and supplier balances in with `add invoice` and a ledger reference.
- **Progress claims already issued.** Add the last claim per project with its earned-to-date figure so the next claim starts from the right place.
- **Retention money** held from subcontractors: add each amount with `add retention` and its trust account reference.
- **Units of measure.** A line in a unit other than the item's base unit is refused. Convert it first.

## Run both side by side

Keep MYOB Acumatica running for one month end. Compare stock, open orders, project costs and work in progress between the two. When they agree, stop entering in MYOB Acumatica and keep its exports in your archive for the retention period.

Enterprise DNA does this mapping, the reconciliation and the parallel month for businesses that want it done for them: https://enterprisedna.co/omni/instead-of/myob-acumatica
