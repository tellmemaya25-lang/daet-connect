# CONNECT-DAET.ph — tours subsystem starter

This repository currently contains the first tours feature: operator accreditation registration and the admin approval queue. It uses the App Router, Server Actions, Supabase Auth/Storage/Postgres, and mobile-first Tailwind UI.

## Local setup

1. Install Node.js 20.9+ and run `npm install`.
2. Copy `.env.example` to `.env.local`; fill in the Supabase URL, anon/publishable key, and service-role key. Never commit `.env.local` or expose the service-role key to browser code.
3. Create a **private** Supabase Storage bucket named `tours-operator-documents` (or set `TOURS_OPERATOR_DOCUMENTS_BUCKET`). Set its maximum file size to at least 5 MB and allow `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. The service-role key uploads files from the server; private signed URLs are generated for admins and expire after 10 minutes.
4. Run `npm run dev`.

The app expects the existing `get_my_role()` RPC to return the signed-in user's `profiles.role` value. Registration is limited to `tourist`/`operator` accounts; the role is re-checked on the server. Admin approval sets `profiles.role = 'operator'` and the dashboard also requires an `approved` `tours_operators.accreditation_status` row. The platform-wide sign-in/profile-provisioning flow is not part of this feature; the pages link to `/login`, so wire that path to the shared Supabase Auth experience before launch.

The existing schema should enforce at most one operator application per `user_id` (including rejected applications, which are updated on resubmission). The action checks current status and uses a conditional update, but database uniqueness is still required to prevent simultaneous first submissions from creating duplicates.

## Existing schema integration

No database tables, enums, or migrations are created by this feature. Because the repository started without generated Supabase types or the schema DDL, the field mapping is centralized in `src/lib/tours/operator-contract.ts` and currently expects:

- `tours_operators`: `id`, `user_id`, `business_name`, `contact_person`, `contact_email`, `contact_phone`, `business_address`, `dti_registration_url`, `business_permit_url`, `gcash_qr_url`, `accreditation_status`, `rejection_reason`, `reviewed_by`, `reviewed_at`, and `created_at`.
- `profiles`: `id` (same UUID as `auth.users.id`) and `role`.

The three `*_url` columns contain **private Storage object paths**, not public URLs. If the verified schema uses different names, change the centralized contract and the select/update payloads to match it; do not add or recreate tables. The feature fails closed if an authenticated role cannot be read.

## Security notes

- Application documents are private. The browser sends them to a Server Action; the server checks the authenticated user, role, total/per-file size, MIME signature, and ownership path before upload.
- The action uses the service-role client only on the server and only after checking the user's Supabase session. Admin listing/review repeats a server-side `get_my_role() === 'admin'` check.
- Operator pages must continue checking both role and accreditation status in future Server Actions, not just hide dashboard links in the UI.
- Admin document links are short-lived signed URLs. Do not make this bucket public.
- Images are recompressed in the browser before upload (QR images retain lossless PNG output where possible); PDFs are uploaded unchanged.
