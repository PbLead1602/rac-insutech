# Customer account and quotation access

RAC uses three separate business records so public leads are not lost and approved Customers are not duplicated.

```text
Public visitor -> Enquiry -> Registered account -> Admin approval -> Customer -> Quotation
```

## Access rules

- Anyone can submit an enquiry at `/?quote=1`.
- The enquiry is stored immediately and receives an `ENQ-YYYYMMDD-####` reference.
- The browser receives an opaque, two-hour continuation token. It contains no customer details.
- A visitor then signs in or creates an account. The original enquiry is linked to that account only after the authenticated continuation is validated.
- `customer_accounts.approval_status` is one of `pending_email_verification`, `pending_admin_approval`, `active`, `rejected`, `suspended`, or `archived`.
- Only an `active` account with an approved `customers` record can use `/generate-quotation` or `POST /api/quotations`.
- Admin approval is transactional in `approve_customer_account`: it creates or links one Customer, activates the account, and links its enquiries. It does not alter issued quotations.

## Admin workflow

1. Sign in to `/admin`.
2. Open **Sales → Account approvals**.
3. Review identity details, email-verification state and the linked original enquiry.
4. Choose **Approve account**. This creates/links the Customer and sends an approval email through Brevo when configured.
5. Use **Reject** or **Suspend access** with an internal reason when access must be restricted.

The Customers screen shows only account-linked customer records. Pending registration requests remain in Account approvals, not Customers.

## Customer workflow

1. Submit an enquiry.
2. Select **Sign in** if already registered, or **Create an account** for a new registration.
3. In production, verify the email link from Supabase Auth.
4. Wait on `/account/pending-approval` until RAC Admin approves the account.
5. After approval, sign in and the saved enquiry returns the customer to the quotation builder.

Customer pages are available at `/account`, `/account/enquiries`, `/account/quotations`, and `/account/profile`. Server routes enforce account ownership; the browser never supplies the commercial customer identity used to issue a quotation.

## Production activation

1. Apply all migrations in order, including `database/migrations/0014_customer_account_approval.sql`.
2. Configure Supabase Auth email/password sign-up and add the deployed `/auth/callback` URL to its redirect allow-list.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` using `.env.example` as the template.
4. Configure Brevo for approval and quotation notifications, and Turnstile for public form protection.
5. Set `NEXT_PUBLIC_ENABLE_DEV_MOCKS=false` in production.

Email is the production sign-in and verification method. Mobile is captured as a business identity and duplicate-detection field. Mobile OTP sign-in should only be enabled later when an SMS provider and its operating cost are approved.

## Development fallback

With no production credentials and `NEXT_PUBLIC_ENABLE_DEV_MOCKS=true`, registration is treated as email-verified so the full review path can be tested locally. It still starts as `pending_admin_approval`; an Admin must approve it before a Customer and quotation access exist.
