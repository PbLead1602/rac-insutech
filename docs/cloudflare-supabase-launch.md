# RAC Insutech V2 production launch runbook

## Target architecture

| Concern | Production service |
| --- | --- |
| Public website, Admin portal, Customer portal and API routes | Cloudflare Worker `rac-insutech-v2` |
| Domain and DNS | Existing Cloudflare zone for `racinsutech.com`; Namecheap remains the registrar |
| Database, authentication and future file storage | Supabase |
| Customer and operational email | Brevo, plus Brevo SMTP in Supabase Auth |
| Form protection | Cloudflare Turnstile |

V1 remains the production service until the V2 preview passes the acceptance checklist. Do not assign `racinsutech.com` or `www.racinsutech.com` to the V2 Worker during preview.

## 1. Create and deploy the Supabase V2 project

The V2 project is `rac-insutech-v2` (`igyzwgavxzpoxbnlgkhd`). Keep V1 and its data path untouched during this preview phase.

1. Store the project URL, anon key and service-role key in a password manager. The service-role key is server-only and must never appear in Git, browser code or a public document.
2. The executable schema source is [`supabase/migrations`](../supabase/migrations), not the historic `database/migrations` folder. It contains the V2 schema, Admin hardening, 28 product records and 807 governed rate-card configurations.
3. In a **normal interactive PowerShell window** in the project folder, run the following commands. Do not paste a Supabase access token, database password, anon key or service-role key into chat.

   ```powershell
   npx supabase login
   npx supabase link --project-ref igyzwgavxzpoxbnlgkhd
   ```

   The second command asks for the database password chosen when the Supabase project was created. The CLI stores the link locally in ignored state only.

4. Back in this project, preview the exact release and apply it only after the preview lists migrations `20260830000001` through `20260830000018`:

   ```powershell
   npm run supabase:push:dry
   npm run supabase:push
   npx supabase migration list --linked
   ```

   Do **not** use `supabase db reset --linked`; it is destructive. Do **not** use `--include-seed` in production. `supabase/seed.sql` exists only for fresh local development; the initial commercial baseline is the versioned `20260830000017` migration.

5. Before the public app receives Supabase credentials, create the sole RAC Admin deliberately:

   - In **Supabase Dashboard → Authentication → Users**, create the intended RAC Admin email/password account and auto-confirm that employee account.
   - In **SQL Editor**, replace the placeholder and execute the following one-time promotion. It refuses to create a second primary Admin.

   ```sql
   update public.profiles
   set role = 'admin', is_primary_admin = true
   where lower(email) = lower('<RAC_ADMIN_EMAIL>')
     and not exists (
       select 1 from public.profiles where is_primary_admin
     );

   select email, role, is_primary_admin
   from public.profiles
   where lower(email) = lower('<RAC_ADMIN_EMAIL>');
   ```

   A successful result is exactly one row with `role = admin` and `is_primary_admin = true`. Migration `20260830000016` prevents all later public registrations from becoming an Admin by accident.

6. In **Authentication → Providers**, enable Email/Password sign-in. For preview, keep customer email confirmation on and add the preview callback URL listed below before creating a test Customer.

7. Run the customer-registration and Admin-approval acceptance tests before entering any Cloudflare or custom-domain credentials.

## 2. Configure Supabase authentication and email

Before customer registration is enabled, set these Supabase Auth settings:

- Site URL: `https://racinsutech.com` (at cutover).
- Redirect URLs:
  - `https://<v2-preview-url>/auth/callback`
  - `https://racinsutech.com/auth/callback`
  - `https://www.racinsutech.com/auth/callback`
- Configure a verified Brevo SMTP sender in **Authentication → Email templates / SMTP**. Application notification email uses the Brevo API, while Supabase Auth verification and password messages use Supabase's SMTP configuration.

Use the V2 preview URL as the Site URL until the production domain is switched, then change it to the canonical production URL.

## 3. Configure Cloudflare Worker V2

1. Sign in to the Cloudflare account that owns the existing `racinsutech.com` zone.
2. Keep the current V1 Pages/Worker configuration and custom domains unchanged.
3. Deploy the `v2-nextjs-rebuild` branch as Worker **`rac-insutech-v2`**. Its `*.workers.dev` URL is the first safe preview URL.
4. In Worker **Settings → Variables and Secrets**, add the values below. Add public values at build time and runtime; add secrets only as encrypted Worker secrets.

### Public build/runtime values

```dotenv
NEXT_PUBLIC_SITE_URL=https://<v2-preview-url>
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_ENABLE_DEV_MOCKS=false
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
NEXT_PUBLIC_QUOTATION_GST_RATE=18
```

### Worker secrets

```dotenv
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
BREVO_API_KEY=<brevo-api-key>
BREVO_SENDER_EMAIL=<verified-sender-email>
BREVO_SENDER_NAME=RAC Insutech
RFQ_RECIPIENT_EMAIL=racinsutech@gmail.com
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
```

Do not set any `RAC_DEVELOPMENT_*` variables in Cloudflare. Do not upload `.env.local`, `.dev.vars` or `.rac-insutech-development-data.json`.

## 4. Turnstile

Create a Turnstile widget for the preview hostname first. After cutover, add both production hostnames. Keep the widget in managed mode and verify that the Worker has the matching secret key.

## 5. V1 data migration

The local development store is not production data and is intentionally excluded from Git. If V1 has MySQL lead/customer data worth retaining, migrate it **before the V2 domain cutover**:

1. Export V1 MySQL data to a dated, access-controlled backup.
2. Map old leads to `enquiries`; map only approved, valid contacts to V2 `accounts` and `customers`.
3. Do not import legacy passwords. Customers must register or receive a password-reset invitation through Supabase Auth.
4. Dry-run the import into the V2 preview Supabase project and validate record counts, company/email/mobile duplicates, quotation ownership and data quality.
5. At cutover, pause V1 data-entry forms, take a final export, run the delta import, reconcile counts and then switch the domain.

There must be no period where V1 and V2 both accept production enquiries. That is how duplicate leads and inconsistent quotation records are avoided.

## 6. Acceptance checklist before cutover

- Public pages, products, brochures and contact/enquiry forms work.
- Turnstile accepts valid submissions and rejects invalid ones.
- A new enquiry is stored in Supabase.
- A new user can register, verify email and reach pending Admin approval.
- An Admin can approve, reject and suspend accounts.
- An approved Customer can sign in, create a quotation, download the PDF and view their history.
- Rate-card changes apply to future quotations only; issued quotations remain unchanged.
- Brevo sends enquiry, approval and quotation notifications.
- Admin and Customer authorization checks prevent cross-account access.
- V2 health endpoint reports `configured` for Supabase, Brevo and Turnstile.
- A database export and a V1 rollback plan are documented.

## 7. Safe cutover and rollback

1. Announce a short maintenance window and pause V1 form submissions.
2. Complete the final V1-to-V2 import and reconciliation.
3. Change the V2 Worker custom domain to `racinsutech.com`; add `www.racinsutech.com` only if it is the chosen public alias.
4. Make `NEXT_PUBLIC_SITE_URL` the canonical production URL and redeploy V2.
5. Retest the public enquiry, customer registration, Admin approval and quotation workflow on the actual domain.
6. Keep V1 deployed but detached from the production domain for a defined rollback period. If a critical defect is found, restore the V1 custom-domain mapping and stop V2 writes before any data correction.

## Cost and reliability note

Cloudflare Workers has a free tier suitable for an initial low-volume launch. Supabase Free is useful for preview and early testing, but it can pause after inactivity and does not include downloadable backups. For a dependable commercial system with customer and quotation records, budget for a paid database plan and scheduled backups before relying on V2 as the only system of record.
