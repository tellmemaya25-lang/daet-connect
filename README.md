# CONNECT-DAET.ph — tours subsystem starter

This repository contains the CONNECT-DAET tours subsystem, including operator and local-guide accreditation flows with admin approval queues. It uses the App Router, Server Actions, Supabase Auth/Storage/Postgres, and mobile-first Tailwind UI.

`docs/project-context.md` is the living context document: current architecture, the verified live database shape, security rules, draft-migration status, and outstanding work. When it conflicts with the code or the database, the code and database win.

## Local setup

1. Install Node.js 20.9+ and run `npm install`.
2. Copy `.env.example` to `.env.local`; fill in the Supabase URL, anon/publishable key, and service-role key. Never commit `.env.local` or expose the service-role key to browser code.
3. Create a **private** Supabase Storage bucket named `tours-operator-documents` (or set `TOURS_OPERATOR_DOCUMENTS_BUCKET`). Set its maximum file size to at least 5 MB and allow `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. The service-role key uploads files from the server; private signed URLs are generated for admins and expire after 10 minutes.
4. Run `npm run dev`.
5. Run `npm test` for unit/component/action tests. `npm run test:e2e` runs the Playwright mobile registration flow in Supabase preview mode; install the browser once with `npx playwright install chromium` if needed.

The app expects the existing `get_my_role()` RPC to return the signed-in user's `profiles.role` value. Registration is limited to `tourist`/`operator` accounts; the role is re-checked on the server. Admin approval sets `profiles.role = 'operator'` and the dashboard also requires an `approved` `tours_operators.accreditation_status` row. The platform-wide sign-in/profile-provisioning flow is not part of this feature; the pages link to `/login`, so wire that path to the shared Supabase Auth experience before launch.

The live schema enforces at most one operator application per `profile_id` through the `tours_operators_profile_id_key` unique constraint (including rejected applications, which are updated on resubmission). The action also checks current status and uses a conditional update.

## Existing schema integration

No database tables, enums, or migrations are created by this feature. Because the repository started without generated Supabase types or the schema DDL, the field mapping is centralized in `src/lib/tours/operator-contract.ts` and currently expects:

- `tours_operators`: `id`, `profile_id`, `business_name`, `business_description`, `business_address` (nullable), `contact_person`, `contact_email`, `contact_phone`, `dti_registration_url`, `business_permit_url`, `gcash_qr_url`, `accreditation_status`, `accreditation_notes`, `reviewed_by`, `reviewed_at`, `created_at`, and `updated_at`.
- `profiles`: `id` (same UUID as `auth.users.id`) and `role`.

The three `*_url` columns contain **private Storage object paths**, not public URLs. If the verified schema uses different names, change the centralized contract and the select/update payloads to match it; do not add or recreate tables. The feature fails closed if an authenticated role cannot be read.

## Security notes

- Application documents are private. The browser sends them to a Server Action; the server checks the authenticated user, role, total/per-file size, MIME signature, and ownership path before upload.
- The action uses the service-role client only on the server and only after checking the user's Supabase session. Admin listing/review repeats a server-side `get_my_role() === 'admin'` check.
- Operator pages must continue checking both role and accreditation status in future Server Actions, not just hide dashboard links in the UI.
- Operator business documents (`dti_registration_url`, `business_permit_url`, `gcash_qr_url`), direct contact details (`contact_person`, `contact_email`, `contact_phone`), and admin review fields (`accreditation_notes`, `reviewed_by`, `reviewed_at`) are **service-role only**. Row-level security cannot hide columns of a visible row, and the `Public can view approved operators` policy would otherwise expose them for every approved operator, so the boundary is enforced with column-level `REVOKE`/`GRANT` in `supabase/migrations/20261017130000_operator_document_privacy.sql` (draft, not applied). `OPERATOR_RESTRICTED_COLUMNS` and `OPERATOR_SESSION_SAFE_COLUMNS` in `operator-contract.ts` mirror that migration and are covered by tests.
- `authenticated` must keep `SELECT` on `tours_operators.id`, `.profile_id`, and `.accreditation_status`: the `tours_packages` family of RLS policies match ownership through `tours_operators.profile_id = auth.uid()`, and policy expressions run with the invoking user's privileges. Revoking those columns would break every package query.
- Admin document links are short-lived signed URLs. Do not make this bucket public.
- Images are recompressed in the browser before upload (QR images retain lossless PNG output where possible); PDFs are uploaded unchanged.

## Operator package management (Module 3)

Approved operators manage tour packages at `/tours/operator/packages` (list), `/tours/operator/packages/new` (create draft), and `/tours/operator/packages/{packageId}` (edit details, pricing, and map stops, then submit for review). The operator dashboard links to the list.

Field mapping lives in `src/lib/tours/package-contract.ts` and shared validators in `src/lib/tours/package-validation.ts`. Expected tables:

- `tours_packages`: `id`, `operator_id` (FK to `tours_operators.id`), `title`, `description`, `location_name`, `duration_value` (integer), `duration_type`, `inclusions`, `exclusions`, `cover_image_url`, `gallery_urls`, `status`, `created_at`, `updated_at`.
- `tours_package_price_variants`: `id`, `package_id`, `variant_name`, `min_pax`, `max_pax`, `price_per_pax`, `flat_price`, `is_default`, `created_at`.
- `tours_package_stops`: `id`, `package_id`, `stop_order`, `location_name`, `latitude`, `longitude`, `description`, `estimated_duration_minutes` (integer), `created_at`.

`duration_value` and `estimated_duration_minutes` are integer columns, so the validators reject fractional values rather than letting Postgres round them silently.

### Authorization boundary

Package Server Actions use the authenticated session client, so RLS is the real boundary. Each action independently re-verifies the session, `operator` role, approved accreditation, package ownership, and draft status; the page-level gate in `src/lib/tours/operator-package-access.ts` is routing/UX only and must never be relied on for authorization.

Pricing and stops are written through the `SECURITY DEFINER` RPCs `replace_package_price_variants` and `replace_package_stops`, which re-check ownership and draft status in the database and replace the whole child collection in one transaction. `stop_order` is derived from array ordinality, never from a client-supplied value.

`submitPackageForReview` delegates completeness validation and the `draft → pending_review` transition to the `submit_package_for_review(p_package_id uuid)` RPC introduced by `supabase/migrations/20261017120000_module3_package_authorization.sql`, so both happen inside one transaction and a concurrent edit cannot slip between them. The action surfaces only the RPC's deliberate messages and hides any other database error behind a generic one, logging the raw error server-side. **The RPC exists only once that migration is applied**; on an unmigrated database submission fails with the generic message.

### Database migrations — applied and verified 2026-10-20

The three files in `supabase/migrations/` are applied to the live database and verified; together they are the authoritative record of the authorization layer. Before them the live database had:

1. **No policies on `tours_package_stops`** despite RLS being enabled. Reads returned an empty set with no error while the write RPC succeeded, so operators could save stops but never read them back and submission always failed with “Add at least one map stop before submitting.”
2. **Unrestricted owner policies** on `tours_packages` and `tours_package_price_variants` (`FOR ALL`, ownership check only, no draft or accreditation gate), which allowed an operator to self-publish a package or edit the pricing of a published package directly through PostgREST, bypassing admin review.
3. **No admin policy on `profiles`**, which is why the guide review queue rendered “Name unavailable”: the admin page reads `profiles.id,full_name` with the session client and RLS filters every row that is not the admin’s own profile.
4. **No nonnegative-price, pax-range, or single-default-variant constraints**, all of which were application-layer rules only.

`20261017120000_module3_package_authorization.sql` fixed 1–4 and added the atomic `submit_package_for_review` RPC. `20261020120000_stops_policy_correction.sql` removed two stops policies that had been created **outside this repository** — an ownership-only `FOR ALL` that re-opened hole 2, and a redundant public SELECT — and restored the missing own-stops SELECT. `20261017130000_operator_document_privacy.sql` closes the operator document/contact exposure described under Security notes with column-level grants and revokes the unused `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE` privileges from `anon`/`authenticated`.

The verification signature, the queries to re-check it, and the incident note live in `docs/project-context.md` §6. Package media upload is **not** implemented: `PACKAGE_STORAGE_BUCKET` is declared but unused, and `cover_image_url`/`gallery_urls` store the references the operator supplies.

## Guide accreditation

Guide registration adds `/tours/guide/register`, `/tours/guide/pending`, `/tours/guide/dashboard`, `/tours/guide/my-qr`, and the admin queue at `/tours/admin/guides`. The application stays pending until an admin approves it; the dashboard and downloadable/printable badge QR each re-check both `profiles.role = 'guide'` and the approved status on the server.

The guide ID document goes to a separate **private** Storage bucket named `tours-guide-sensitive-documents` (or `TOURS_GUIDE_SENSITIVE_BUCKET`). Configure it with a 5 MB max object size and `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Storage reads are not exposed to browser clients: an admin-only Server Action selects only the stored object path using service_role and returns a 3-minute signed download link. The QR payload contains only the public guide row UUID; it never includes ID numbers, document paths, or consent data. Sensitive-table reads and writes and private-link creation emit a minimal structured `guide-sensitive-audit` event to server logs containing actor ID, guide ID, operation, outcome, and timestamp—but no ID number, document path, URL, or file content. No audit table is assumed or added; configure the hosting platform’s server-log retention/access policy before production use.

No guide schema is created or migrated. The existing database should enforce at most one `tours_guides` row per `profile_id` to avoid concurrent duplicate first applications. Since the repository has no generated database types or DDL, `src/lib/tours/guide-contract.ts` centralizes the expected field names:

- `tours_guides`: `id`, `profile_id`, `contact_phone`, `bio`, `consent_full_id_display`, `consent_given_at`, `accreditation_status`, `accreditation_notes`, `reviewed_by`, `reviewed_at`, and `created_at`.
- `profiles`: `id`, `full_name`, and `role`; guide registration syncs the applicant’s public name here.
- `tours_guide_sensitive_info` (service_role only, with a unique `guide_id` for upsert): `guide_id`, `full_legal_name`, `id_type`, `id_number`, and `id_document_path`.

Verify those names against the existing locked schema before production use, and ensure the existing `profiles.role` type/policies already accept the `guide` role value. The Server Action rejects unchecked consent before upload or database writes, generates `consent_given_at` on the server, writes consent and the timestamp to the public guide row, and writes the full legal name and ID details only to the sensitive row via the server-side service-role client. No Client Component or Server Component queries the sensitive table. Existing RLS policies must allow an authenticated applicant to read their own status and insert/update their own guide row, allow the admin queue’s authenticated query to select pending public rows and their corresponding profile names, and prevent public readers from seeing unapproved profiles; the private sensitive table and private Storage bucket must remain inaccessible to browser clients. No policy or schema changes are bundled here.
