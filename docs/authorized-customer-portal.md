# Authorized Customer Portal

The portal is a permissioned view of RAC's existing shared sales records. It does not create duplicate customer, enquiry, project, quotation or pricing data.

## Access rules

- Anonymous visitors can browse the public site and submit an enquiry.
- Pending accounts can view their profile, submitted enquiries and approval status.
- Active accounts can use the complete portal, including quotations, projects, documents and revision requests.
- Suspended accounts retain read-only historical access; commercial actions are blocked.
- Rejected and archived accounts are restricted from the portal.

## Routes

`/account`, `/account/enquiries`, `/account/quotations`, `/account/projects`, `/account/documents`, `/account/profile`, and `/account/support` are customer-facing. The quotation builder remains at `/generate-quotation` and verifies approval server-side.

## Data and pricing protection

All portal API routes resolve the signed-in account server-side and return only owned records. Quotation detail responses omit internal notes and follow-up metadata. Customers see quoted unit rates and commercial totals only; rate cards, cost, margin, discounts and admin override data are not returned.

PDF downloads use the authenticated owner check at `/api/quotations/[quoteId]/pdf`. Public share links direct customers back to their authorized portal for protected download.

## Deployment

Apply `database/migrations/0015_authorized_customer_portal.sql` after migration `0014_customer_account_approval.sql`. It creates customer revision requests, adds the `customer` document visibility level and establishes customer ownership RLS policies.
