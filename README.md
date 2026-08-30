# RAC Insutech

An SEO-ready RAC Insutech website built with Next.js, TypeScript, Tailwind CSS, Framer Motion and Supabase-ready services. It is designed to start locally without real integration credentials and switch cleanly to production services when keys are supplied.

## Run locally

```bash
copy .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000` for the public site, `http://localhost:3000/admin` for the CMS shell, and `http://localhost:3000/api/health` to inspect integration modes without exposing secrets.

With no credentials in `.env.local`, development mocks are enabled by default:

- Quote requests, account approvals, customers, quotations, rates and Admin content are retained in the ignored local file `.rac-insutech-development-data.json`, so they survive a local server restart.
- The quote form shows a clearly labelled Turnstile mock fallback.
- `/admin` accepts only the configured development Admin email and password. Its signed local session expires after 12 hours; customer mock sessions use the same signed-session protection and validate the password created during registration.

The durable local store is for one developer machine only. It is deliberately ignored by Git and is not a substitute for production backups, concurrent users, or the production database. For a live system, configure Supabase and apply all migrations.

These fallbacks are disabled automatically when `NODE_ENV=production`. Set `NEXT_PUBLIC_ENABLE_DEV_MOCKS=false` to exercise configuration-error states locally.

## Environment variables

Start from [`.env.example`](./.env.example). Do not commit `.env.local` or any real key.

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser/server | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser | Safe public key used for auth and RLS-limited client requests. |
| `SUPABASE_SERVICE_ROLE_KEY` | server routes only | Never expose this in browser code. It saves RFQs and uploads private files. |
| `DATABASE_URL` | migration/tooling | Reserved for CLI/backup tooling; the app itself uses Supabase. |
| `BREVO_API_KEY` | server route only | Brevo transactional-email API key. |
| `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` | server route | Must be a verified Brevo sender. |
| `RFQ_RECIPIENT_EMAIL` | server route | Sales inbox for internal RFQ alerts. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | browser | Cloudflare Turnstile public site key. |
| `TURNSTILE_SECRET_KEY` | server route only | Cloudflare Turnstile server secret. |
| `NEXT_PUBLIC_QUOTATION_GST_RATE` | quotation UI/server | GST percentage used for the Phase 1 quotation calculation; defaults to 18. |
| `RAC_DEVELOPMENT_ADMIN_EMAIL` | local development only | Sole Admin sign-in email when Supabase is not configured. |
| `RAC_DEVELOPMENT_ADMIN_PASSWORD` | local development only | Sole Admin password when Supabase is not configured. Keep it in `.env.local`. |
| `RAC_DEVELOPMENT_SESSION_SECRET` | local development only | Long random secret that signs local development sessions. |

## Supabase setup

1. Create a Supabase project and copy its URL, anon key, and **service role key** into `.env.local` (or your deployment environment).
2. In the Supabase SQL editor, run every migration in [`database/migrations`](./database/migrations) in numeric order, from `0001` through `0015`.
3. Run [`database/seed.sql`](./database/seed.sql) for starter categories, applications, industries, and services. It intentionally includes no unverified manufacturer/dealer claims or technical product specifications.
4. In **Authentication → Users**, invite the first staff member. The schema trigger creates their profile automatically. Then promote it in the SQL editor:

   ```sql
   update public.profiles
   set role = 'admin', is_primary_admin = true
   where email = 'your-admin@company.com';
   ```

   RAC uses one dashboard account only. If profiles existed before migration `0008`, the oldest profile is selected as the Admin. To choose another account, first set every profile's `is_primary_admin` value to `false`, then run the SQL above for the intended email.

5. Add all public and production URLs to Supabase Auth redirect URLs. Enable the email/password provider before using `/admin` in production.

The migration creates a private `rfq-attachments` storage bucket with a 10 MB file limit. The RFQ route records a private object path rather than a public URL; staff tooling should request short-lived signed URLs for downloads.

## RFQ flow

`Quote form → Turnstile verification → Zod validation → Supabase insert / private upload → Brevo sales notification`

The implementation lives in:

- [`app/api/rfq/route.ts`](./app/api/rfq/route.ts) — accepts multipart form data, validates required fields, attachment types, and size.
- [`lib/services/turnstile.ts`](./lib/services/turnstile.ts) — server-side token verification with explicit mock mode.
- [`lib/repositories/enquiries.ts`](./lib/repositories/enquiries.ts) — service-role persistence and private Supabase Storage upload with an in-memory development fallback.
- [`lib/services/brevo.ts`](./lib/services/brevo.ts) — Brevo API adapter with a non-emailing development fallback.

## Phase 1 quotation generator

`Request a quote form → /generate-quotation → valid configuration → basket → customer details → Turnstile → server-side price revalidation → quotation/PDF/email`

- The initial Request a quote form collects the required full name, company, mobile number and email before it opens the quotation builder. The form draft is kept only in browser session storage; it is not put in the URL.
- Phase 1 supports XLPE Sheet Insulation, XLPE Tubes, Nitrile Rubber Sheet, Open Cell Nitrile Rubber Sheet, Nitrile Rubber Tube, Insulation Tape and Insulation Adhesive. Each uses its appropriate commercial unit: rolls, boxes, cartons, running metres, tape rolls/units or adhesive drums.
- The browser never submits a price. `app/api/quotations/route.ts` loads the server catalogue, rechecks combinations, applies carton rounding, calculates GST, and creates the quote number.
- The supplied XLPE/NBR and Nitrile Tube Class O workbooks provide the embedded development rate card, including sheet dimensions, available laminations, tube pack lengths and per-unit rates. The generator uses a clearly labelled, temporary in-memory store, Turnstile mock verification and mock email logging when production credentials are absent.
- Before launch, confirm the current commercial validity with RAC, then import current approved rates using [`database/quotation-rate-card-template.csv`](./database/quotation-rate-card-template.csv) into `quotation_rate_cards`. The server will then replace the embedded rate with that governed table.

The main implementation is in [`app/generate-quotation/page.tsx`](./app/generate-quotation/page.tsx), [`lib/quotations/catalogue.ts`](./lib/quotations/catalogue.ts), [`app/api/quotations/route.ts`](./app/api/quotations/route.ts), and [`lib/repositories/quotations.ts`](./lib/repositories/quotations.ts). Secure quote links use an opaque access token and the branded PDF is generated only after that token is verified.

## Admin rate-list imports

In **Admin → Rate cards**, use **Import rate list** to upload an `.xlsx` supplier workbook. The importer analyses the workbook with a reusable RAC profile, maps recognised rows to the controlled configuration key (`Product + Class + Thickness + Size + Lamination + Order unit`), and compares its rate with the active card.

- Supported profiles: XLPE tubes, Nitrile tube Class 1, Nitrile tube Class O, XLPE/Nitrile sheets, insulation tape and insulation adhesive.
- New configurations, changed rates, unchanged rows, duplicates and invalid rows are shown before any write occurs. Template-position mappings are labelled **Review** and are never selected automatically.
- Select only the rows you approve and click **Confirm**. Issued quotations are unchanged; future quotations use the revised rate cards. The change history contains the supplier file name and profile.
- Migration `0012` stores confirmed source file metadata, workbook hash, date, mapping, old/new rate, validation notes and applied rate-card reference. It deliberately stores audit metadata instead of an unrestricted supplier file upload.

## Brevo and Turnstile activation

### Brevo

1. Verify `BREVO_SENDER_EMAIL` in Brevo.
2. Create an API key with transactional-email permission.
3. Set `BREVO_API_KEY`, sender fields, and `RFQ_RECIPIENT_EMAIL` in your deployment environment.
4. Submit a real test RFQ and confirm delivery before launch.

### Cloudflare Turnstile

1. Create a Turnstile widget for the development/production hostname.
2. Add the widget's site key and secret to the matching environment.
3. The public form loads Cloudflare's script only when a site key is present. The backend always verifies the token when a secret is present.

## Admin authentication and authorization

`/admin` uses Supabase email/password authentication when public Supabase keys are configured. RAC has one application role, `admin`, and only one profile can be the primary Admin at a time. That Admin has access to every dashboard area: products, rate cards, enquiries, quotations, resources, website settings and company data. Additional Supabase users, if ever created, do not receive dashboard access.

Row-level security protects published public content and limits internal content and enquiry access to the sole Admin. The service-role key is used exclusively by trusted route handlers and must never be prefixed with `NEXT_PUBLIC_`.

## Admin operating system

The complete single-Admin operating system is available at `/admin`. Every navigation area is connected to protected API routes, repository contracts, development mock data and Supabase-ready persistence:

- **Sales:** enquiries, quotations, customers, projects, notes, follow-ups, status changes and secure quotation PDFs.
- **Catalogue and commercial:** products, variants, categories, brands, applications, industries and governed rate cards with historical rate changes.
- **Content:** services, documents, resources, reusable site-content records and versioned draft/publish/archive states with SEO fields.
- **Media:** a governed media register with file paths/URLs, alt text, metadata, visibility and archiving. It registers existing public assets in development; enable a Supabase Storage upload workflow only after the production bucket and credentials are configured.
- **System:** company/quotation settings, integration-safe configuration, immutable activity logging and the sole Admin profile.

The main header action opens the creation view for content areas. All mutations are validated server-side, are available through the local mock fallback, and are logged in the Activity area. Public site pages retain their existing approved static content until the production Supabase content store is configured and explicitly bound for publishing.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

For an HTTP smoke check while the server runs:

```bash
curl http://localhost:3000/api/health
```

## Next implementation steps after credentials

1. Run the migrations/seed against the production project and create the sole `admin` user.
2. Replace the supplied starter records with verified RAC product, brand, and manufacturer documentation.
3. Configure signed URLs in the enquiry-admin screen before exposing attachment downloads.
4. Configure Supabase Storage upload policies if Admin should upload files directly rather than register managed asset paths.
5. Bind approved published `site_content` records to public pages as part of the production content-publishing rollout.
6. Set production variables in Cloudflare, configure `racinsutech.com` in Turnstile/Supabase, and send a complete RFQ end-to-end test.
