# RAC Insutech V2 — System Workflow Reference

Release reference: 1 October 2026

This reference describes the current RAC Insutech V2 workflow by portal and operational task. It records the implemented workflow; it does not replace RAC commercial approvals, customer authorisation, or the controlled deployment procedure.

## 1. Public website

### 1.1 Public catalogue and content discovery

- Visitors browse RAC material, application, industry, resource, brochure and contact pages.
- Published content is available publicly. Internal content, customer data, quotation data and rate cards are not public records.
- Public calls-to-action open the enquiry flow or direct an eligible customer to secure account access.

### 1.2 Public enquiry / RFQ submission

- A visitor enters contact details, product requirement, project information and optional attachment.
- Cloudflare Turnstile is completed in production before the form is accepted. Development uses the clearly labelled mock only when credentials are intentionally absent.
- Server validation checks required values, attachment type and the 10 MB attachment limit.
- The server stores the enquiry and, when present, saves the attachment in the private RFQ storage area.
- RAC receives an operational Brevo notification when configured. A notification failure never requires the visitor to resubmit an already saved enquiry.
- A continuation token is issued for the visitor to continue securely, or an active signed-in customer proceeds to the quotation builder.

### 1.3 Customer registration and approval entry

- A visitor can register for a customer account after an enquiry or through the account flow.
- Email/password authentication verifies identity. The account is pending until RAC Admin approval.
- Registration does not automatically expose commercial rates or another customer's data.

### 1.4 Public quotation access

- Public quotation links use an opaque access token rather than predictable identifiers.
- The token is checked server-side before a branded, protected quotation/PDF is rendered.
- Issued quotations are historical records; later rate-card changes affect future pricing, not issued quotations.

## 2. Customer portal

### 2.1 Customer account lifecycle

- Customer signs in with the account created through the controlled registration flow.
- RAC Admin verifies and activates the authorised customer account.
- The active account is linked to one customer master record and its permitted sales history.

### 2.2 Customer dashboard

- The portal displays only records belonging to the signed-in account: profile, enquiries, quotations, projects, permitted documents and revision requests.
- Internal notes, supplier rate cards, margins, administration-only pricing information and unrelated records are not returned to the customer portal.

### 2.3 Phase 1 quotation builder

- The customer selects valid product configurations and requested quantities.
- The browser submits configuration identifiers and quantities, not trusted price values.
- The server reloads approved configuration/rate data, applies packing and carton rules, recalculates rate, GST and total, then creates the quotation.
- Cloudflare Turnstile is verified before a production quotation is created.
- Customer/project information is associated with the approved account; project information remains specific to the quotation.

### 2.4 Customer profile and project details

- The signed-in customer may maintain permitted profile, address and project information through the portal routes.
- Server-side ownership checks bind an update to the current account/customer record.
- Existing values load for editing and remain separate from unrelated customer records.

### 2.5 Customer quotation revision request

- The customer opens an eligible owned quotation and submits a revision request with the requested changes.
- The request is stored against the customer, account and quotation and changes the quotation status to revision requested.
- RAC Admin reviews and creates the commercial revision; customers do not directly alter issued rates or pricing.

## 3. Admin portal

### 3.1 Admin access and authorisation

- `/admin` uses authenticated Admin access. The system is designed around one primary RAC Admin profile.
- Every Admin API route resolves and checks the Admin context on the server before returning or changing protected data.
- The browser never receives the Supabase service-role key.

### 3.2 Customer and project administration

- Admin can create, review and maintain customer masters, authorised account status, enquiry links, projects and sales notes.
- The manual quotation builder supports an existing active authorised customer path: Admin selects company then customer; the customer profile autofills and is linked to that customer record.
- For a new customer, Admin enters customer details manually. Project name and project location remain quotation-specific fields.

### 3.3 Admin manual quotation builder

- Card order is Customer & project details, Multiple Selection, applicable insulation/custom-built-up configuration, Configuration Lines, then Commercial details/quotation total.
- Multiple Selection remains visible for the standard flow. Nitrile Tube Class O custom-diameter/built-up follows its dedicated custom-built-up sequence.
- Configuration lines contain product, thickness, lamination, material class, size/packing, quantity, unit, Admin-editable rate, subtotal and remove action.
- Nitrile Tube Class O defaults to cartons. Rates are normalised to two decimal places for displayed commercial input/output.
- Custom Built-Up NBR items use their existing controlled builder and pricing calculation; adding an item retains the existing automatic navigation to the item list.

### 3.4 Commercial totals, transportation and GST

- Admin can select transportation at actual or enter a fixed transportation charge for a new or revised quotation.
- Totals are calculated in this order: Subtotal, Transportation, GST, Quotation total.
- GST is calculated on material subtotal plus any fixed transportation charge.
- At-actual transportation is retained as a commercial term and does not add a fixed amount to the quotation total.

### 3.5 Revised quotations and discount

- Admin reviews an existing quotation, prepares a new revision number, updates permitted line rates/discount inputs and supplies a revision reason.
- The source quotation remains historical. The new revision receives its own quote identity and pricing snapshot.
- The revision uses current controlled rate-card data where the established workflow requires it, then applies the authorised commercial adjustment and recalculates transportation, GST and total.

### 3.6 Controlled Rate Import

- Admin selects a RAC import profile and uploads a permitted supplier `.xlsx` workbook.
- The analyser maps recognised rows to the controlled key: Product, Class, Thickness, Size, Lamination and Order Unit.
- The review separates new, changed, unchanged, duplicate and flagged rows. Ambiguous rows remain unselected for Admin review.
- No rate is changed during analysis.
- On confirmation, selected updates are applied in a single set-based database operation with optimistic previous-rate checks, so large workbooks avoid one REST update/audit request per row.
- The import audit stores source-file metadata, mapping, previous/new rate, validation notes and applied rate-card reference. The audit finalisation also runs in the controlled database path.
- Existing issued quotations are immutable. Confirmed rate-card changes only affect future pricing.

### 3.7 Admin content, documents and media

- Admin maintains catalogue, variants, brands, categories, applications, industries, services, documents, settings and registered media.
- Draft/published/archive status determines public availability according to the existing content workflow.
- Private operational documents and media are not public merely because their metadata is administered in the portal.

## 4. Shared system safeguards

### 4.1 Pricing and calculation boundary

- Rates, packing conversions, carton rounding, GST, transportation and totals are recalculated on the server.
- Client-side values are presentation/input data and are not accepted as an authority for commercial pricing.

### 4.2 Data access boundary

- Public browsing remains available for published catalogue/content.
- Customer, quotation, rate-card, import and audit tables are protected by Supabase row-level security and are not anonymously readable.
- Customer browser access is restricted to its own account/quotation records; administrative operations continue through protected server routes.

### 4.3 Integrations

- Supabase stores operational data and private RFQ attachments.
- Cloudflare Turnstile protects public RFQ and quotation submission in production.
- Brevo sends configured operational notifications without becoming a prerequisite for safe data persistence.
- Cloudflare Workers serves the full-stack V2 application after the built Worker release is deployed.

## 5. Local, test and production release process

### 5.1 Local verification

- Run the app with `npm run dev` and test public, customer and Admin routes using authorised test accounts only.
- Run `npm run lint`, `npm run typecheck`, rate-import regression tests, quotation-status tests, RFQ spam-protection tests and `npm run build` before release.
- Never place production secrets in Git or use development mock data as production data.

### 5.2 Database migration sequence

- Apply versioned Supabase migrations before deploying application code that depends on them.
- The controlled-rate-import performance/audit migrations are `20260912000023`, `20260912000024` and `20260912000025`.
- The production RLS repair is `20261001000026_harden_protected_data_rls.sql`.
- Verify anonymous access is denied for protected tables and verify Admin/customer application routes through authorised accounts after migration.

### 5.3 Production deployment

- Push the verified release to `main`.
- Deploy the built V2 Worker through the existing Cloudflare deployment workflow.
- Confirm production health, public page availability, unauthenticated API rejection, authorised Admin/customer access, rate-import review/confirmation and quotation creation before closing the release.

## 6. Operations ownership summary

- Public visitor: browse approved content, submit protected RFQ, register, and use a secure continuation.
- Authorised customer: view only own portal records, generate permitted quotations, manage allowed profile/project fields and request a revision.
- RAC Admin: govern customers, projects, quotations, revisions, rate cards/imports, content and operational settings.
- Server/service layer: validate authority, recalculate commercial values, persist data and communicate with Supabase, Turnstile, Brevo and Cloudflare without exposing private secrets.
