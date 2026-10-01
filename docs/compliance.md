# Record checks and their sources

Checked 1 October 2026. `npm run erp -- compliance` checks the records against the rules below and names the source for each finding. It flags gaps in what is recorded. It does not certify legal compliance, file GST, hold money or replace your accountant or lawyer. When a rule changes, update this page and the check in `scripts/lib/domain.mjs` together.

## Record retention

**NZ.** [Inland Revenue: record keeping](https://www.ird.govt.nz/managing-my-tax/record-keeping) says business records, including electronic records, must be kept for at least seven years. RETENTION_POLICY flags a configured policy under seven years. RETAIN_UNTIL uses the latest of prepared, completed and the recorded period end, plus seven years. SOURCE_EVIDENCE flags a register entry with no archive reference.

**AU.** [business.gov.au: record keeping](https://business.gov.au/finance/payments-and-invoicing/record-keeping) says most business records must be kept for five years. RETENTION_POLICY checks five years and RETAIN_UNTIL uses the later of prepared and completed, plus five. Some records (assets, losses, disputes) need longer: your accountant sets those dates.

## GST invoice details

**NZ.** [Inland Revenue: taxable supply information](https://www.ird.govt.nz/gst/tax-invoices-for-gst/how-tax-invoices-for-gst-work) requires the seller's GST number on supplies over $200, and for supplies over $1,000 the buyer's name plus at least one identifier: physical or postal address, phone number, email, trading name, NZBN or website. SELLER_TAX_NUMBER flags a blank GST number in settings. BUYER_DETAILS flags a receivable over $1,000 whose customer has no address, phone, email or tax ID on file.

**AU.** [business.gov.au: invoicing](https://business.gov.au/finance/payments-and-invoicing/invoicing) says a tax invoice shows your ABN, and "you must also include the buyer's identity or ABN on invoices for sales over $1000". SELLER_TAX_NUMBER flags a blank ABN. BUYER_DETAILS flags a receivable over $1,000 whose customer has neither an ABN nor an address.

The tax invoice itself is raised in your accounting ledger. These checks make sure the details it needs are in the records before it is.

## Retention money held from subcontractors (NZ)

The [Construction Contracts Act 2002](https://www.legislation.govt.nz/act/public/2002/0046/latest/whole.html), as amended by the Construction Contracts (Retention Money) Amendment Act 2023, requires retention money withheld under a commercial construction contract to be held on trust. Held as cash, it sits in a trust account kept only for retentions. The holder reports to the subcontractor as soon as practicable after withholding, and at least every three months after that, with each amount, the contract, the date and the total held.

- RETENTION_TRUST flags an unreleased retention with no trust account reference.
- RETENTION_REPORT flags a retention never reported, or last reported more than three months ago.
- `npm run docs -- retention-statement` and `/draft-retention-report` produce the report. A person sends it, then records it with `report-retention`.

These checks run for NZ only. Australian states run their own retention trust and security of payment rules; add the ones that apply to you with /customise and cite them here.

## House rules

These are business policies in the demo, not law. Change them with /customise.

- BACKUP_REVIEW: no referenced backup in the last seven days. It checks the register, not the backup itself.
- EMPTY_ORDER: a released order with no lines.
- CLAIM_RETENTION: retention on an issued claim above the project's contract rate.

The fictional demo data breaks most of these on purpose: a five year policy in NZ, a claim with no archive reference, no GST number, a $4,600 invoice to a customer with no contact details, and two retentions held from a subcontractor that are overdue for a report.
