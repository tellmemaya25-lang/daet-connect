# CONNECT-DAET.ph — Project Context

Living context document for the tours subsystem. Last updated 2026-10-20 at commit
`06c1789` on branch `arena/eebef541-daet-connect` (PR #4 against `main`).
When facts here conflict with the code or the live database, the code and the
database win — update this file.

---

## 1. Product

A tourism platform for Daet, Camarines Norte, Philippines. Roles: **tourist,
operator, guide, admin**. This document covers the tours subsystem: operator
accreditation, guide accreditation, and operator package management. Bookings,
payments, rewards, and analytics are future modules; preserve their established
architecture when touching them.

## 2. Repository and environment

| Item | State |
|---|---|
| Repo | `tellmemaya25-lang/daet-connect` |
| Branch | `arena/eebef541-daet-connect` — fixed. Never rename, switch, or push elsewhere. |
| PR | #4, open, against `main` |
| Commit order | `504acc5` guide admin type fix → `8f3c845` sign-in route → `92387a0` scoped operator status reads → `091ef6d` live-schema alignment → `fff2e69` Module 3 UI + authorization migration → `06c1789` operator document privacy |

**Sandbox behaviour to plan for.** Between sessions the sandbox resets:
`node_modules` is wiped and the local branch can fall back to the base commit
while the remote retains all commits. Recovery is always:

```bash
git fetch origin
git reset --mixed origin/arena/eebef541-daet-connect
npm ci --no-audit --no-fund
```

No long-lived server survives a reset. `npm run start` serves on `0.0.0.0:3000`
for the live preview; `npm run dev` for development.

## 3. Stack and mandated conventions

- **Next.js 16.4.2** App Router (Turbopack), strict TypeScript, Tailwind v4 with
  tokens `daet-ink`, `daet-forest`, `daet-leaf`, `daet-sand`, `daet-sun`,
  `daet-coral`. Server Actions preferred over route handlers.
- **Supabase**: Auth, Postgres, Storage, Realtime. Clients in
  `src/lib/supabase/{client,server,admin,env}.ts` — browser, session-scoped
  server, and service-role respectively.
- **Tests**: Jest + React Testing Library (`npm test`); Playwright
  (`npm run test:e2e`, guide mobile registration flow).
- **Design**: mobile-first 375px→1440px+, touch targets ≥44px (`min-h-11` /
  `min-h-12`), `rounded-2xl` cards, `rounded-full` primary buttons.
- **Code location constraint**: feature code only in
  `src/app/(subsystems)/tours/`, `src/components/ui/`, and `src/lib/`.
- **Scripts**: `dev`, `build`, `start`, `typecheck`, `test`, `test:e2e`.

## 4. Routes

`/`, `/login`,
`/tours/operator/{register,pending,dashboard}`,
`/tours/operator/packages`, `/tours/operator/packages/new`,
`/tours/operator/packages/[packageId]`,
`/tours/guide/{register,pending,dashboard,my-qr}`,
`/tours/admin/{operators,guides}`.

## 5. Modules

### Operator accreditation

Three-step registration: business info → DTI + business permit → GCash QR.
Uploads go to a **private** bucket (`tours-operator-documents`, override
`TOURS_OPERATOR_DOCUMENTS_BUCKET`); the browser compresses images first; the
server validates total/per-file size, MIME signature, and ownership path before
upload. Admin queue at `/tours/admin/operators` approves by setting
`profiles.role='operator'` plus `accreditation_status='approved'`. Admin
document links are short-lived signed URLs. Rejected applicants resubmit into
the same row via a conditional update.

### Guide accreditation

Registration is at most three steps on mobile. The consent checkbox is
**unchecked by default**; the server requires `consent_full_id_display === true`
and writes the server timestamp before creating the sensitive row; if consent is
false the submission is blocked and **no sensitive row is created**. Sensitive
ID documents go to private `tours-guide-sensitive-documents` (override
`TOURS_GUIDE_SENSITIVE_BUCKET`); reads are service_role-only through a Server
Action returning a 3-minute signed URL, each emitting a minimal
`guide-sensitive-audit` server log (actor ID, guide ID, operation, outcome,
timestamp — never ID numbers, paths, URLs, or content). The QR payload contains
only the public guide row UUID; the badge is downloadable and printable for a
lanyard insert. Guides see "Pending Approval" and cannot use the dashboard or
QR until an admin approves.

### Operator package management (Module 3)

List, create-draft, and edit screens covering core details, pricing variants,
ordered map stops, and submit-for-review. `resolveOperatorPackageAccess` in
`src/lib/tours/operator-package-access.ts` is **routing/UX only** — every Server
Action independently re-verifies the session, the `operator` role, approved
accreditation, package ownership, and draft status, and the database policies
enforce the same boundary. Non-draft packages render read-only. Variants and
stops are replaced wholesale through `SECURITY DEFINER` RPCs; `stop_order` is
derived from array ordinality and never accepted from the client.

## 6. Live database

Verified through read-only queries run in the Supabase SQL Editor; the schema is
dashboard-managed and the repository holds no applied migrations.

**Tables:** `profiles`, `tours_operators`, `tours_packages`,
`tours_package_price_variants`, `tours_package_stops`.

**Enums:** `accreditation_status` (pending / approved / rejected),
`package_status` (draft / pending_review / published / archived),
`duration_type` (hours / days).

**Confirmed shape:**

- `tours_operators` uses `profile_id` (unique, FK → `profiles.id`, cascading)
  and `accreditation_notes`; `business_address` is nullable.
- `duration_value` and `estimated_duration_minutes` are **integer** columns;
  the app validators reject fractional values because Postgres rounds silently
  on assignment.
- `price_variant_check` requires at least one of `price_per_pax` /
  `flat_price` non-null (OR, not XOR). It permits negatives and both-set.
- RLS is **enabled and not forced** on all five tables.

**Policies as of the last verified read (before any draft migration is
applied):**

| Table | Policies |
|---|---|
| `profiles` | own-row SELECT, own-row UPDATE — **no admin policy** |
| `tours_operators` | admin ALL; own-row SELECT; approved-operators public SELECT |
| `tours_packages` | admin ALL; **owner ALL with no draft or accreditation gate**; public SELECT of published |
| `tours_package_price_variants` | admin ALL; **owner ALL with no gate**; public SELECT of published |
| `tours_package_stops` | **none** |

**RPCs:** `get_my_role()`, `replace_package_price_variants(uuid, jsonb)`,
`replace_package_stops(uuid, jsonb)`. All `SECURITY DEFINER`, owned by
`postgres`, `search_path` pinned to `public`. The replace-RPCs re-check
ownership and draft status but lack an approved-accreditation gate.

**Grants:** `anon` and `authenticated` hold full DML including `TRUNCATE` on all
five tables. RLS mitigates row access, but `TRUNCATE` is not covered by RLS.

### Checking current database state

A single query reports whether each draft migration is live:

```sql
select 'stops_policies' as check_name, count(*)::text as value
from pg_policies
where schemaname = 'public' and tablename = 'tours_package_stops'
union all
select 'old_unrestricted_owner_policies', count(*)::text
from pg_policies
where schemaname = 'public'
  and policyname in ('Operator manages own packages',
                     'Operator manages own package pricing')
union all
select 'admin_profiles_policy', count(*)::text
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
  and policyname = 'Admin views all profiles'
union all
select 'submit_rpc_exists', count(*)::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'submit_package_for_review'
union all
select 'column_acl_columns', count(*)::text
from pg_attribute
where attrelid = 'public.tours_operators'::regclass
  and attnum > 0 and not attisdropped and attacl is not null;
```

Signature: `0 / 2 / 0 / 0 / 0` = nothing applied; `6 / 0 / 1 / 1 / 0` =
migration 1 applied; `6 / 0 / 1 / 1 / 8` = both applied.

**Last observed signature: `0 / 2 / 0 / 0 / 0`** (nothing applied). A later SQL
Editor screenshot showed a migration buffer reporting "Success. No rows
returned", consistent with an apply, but it was never confirmed with the query
above. Re-run it before trusting anything below.

## 7. Security rules in force

- Roles are enforced server-side and by RLS; client checks are presentation only.
- Sensitive rows are read server-side with service_role only, and logged.
- Document buckets are private; access only via server-generated signed URLs.
- Operator document and contact columns (`dti_registration_url`,
  `business_permit_url`, `gcash_qr_url`, `contact_email`, `contact_phone`,
  `contact_person`, `accreditation_notes`, `reviewed_by`, `reviewed_at`) are
  service-role only; see migration 2 for the enforcement mechanism.
- Consent semantics per §5; never precheck consent or grant guide dashboard/QR
  access before approval.
- Secrets live in `.env.local` only.
- Admin listing and review re-check `get_my_role() === 'admin'` server-side.

## 8. Draft migrations — neither confirmed applied

Both files are review artifacts in `supabase/migrations/`. Nothing has been run
against the database by this project; the product owner applies them manually
in the Supabase SQL Editor.

### `20261017120000_module3_package_authorization.sql`

1. Adds the six missing `tours_package_stops` policies (own-stops SELECT;
   approved-operator INSERT/UPDATE/DELETE on drafts; public SELECT of published;
   admin ALL). Without them, stops reads return an empty set with no error
   while the `SECURITY DEFINER` write RPC still succeeds — operators can save
   stops but never read them back, and submission always fails with "Add at
   least one map stop before submitting."
2. Replaces the two unrestricted owner policies with draft- and
   approval-gated INSERT/UPDATE/DELETE plus own-rows SELECT, closing the
   self-publish hole.
3. Adds `Admin views all profiles` (SELECT only) — the fix for "Name
   unavailable" in `/tours/admin/guides`, whose page reads
   `profiles.id,full_name` with the session client while RLS filters every row
   that is not the admin's own profile, raising no error.
4. Adds constraints: nonnegative prices, pax range, a partial unique index for
   exactly one default variant per package, and unique `(package_id,
   stop_order)`.
5. Adds `submit_package_for_review(uuid)` so completeness validation and the
   `draft → pending_review` transition happen in one transaction, and adds the
   approved-accreditation gate to both replace-RPCs.
6. Tightens RPC execute grants to `authenticated` and `service_role`.
7. Optionally adds an `updated_at` trigger on `tours_packages` if none exists.

Pre-flight data checks (negative prices, default counts, pax ranges, duplicate
stop orders) were run and returned **all zero**, so existing rows will not abort
it.

### `20261017130000_operator_document_privacy.sql`

Row-level security cannot hide columns of a visible row, so column privacy is
enforced with column-level `REVOKE`/`GRANT`:

1. Revokes table-wide SELECT from `anon` and `authenticated`, then grants only
   public catalogue columns; `authenticated` additionally gets `profile_id`.
2. `id`, `profile_id`, and `accreditation_status` must stay granted to
   `authenticated`: the `tours_packages` family of RLS policies match ownership
   through `tours_operators.profile_id = auth.uid()`, and policy expressions run
   with the invoking user's privileges. Revoking them breaks every package
   query with "permission denied for column profile_id".
3. Revokes unused `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`/`REFERENCES`/`TRIGGER`
   from `anon` and `authenticated`.
4. `notify pgrst, 'reload schema'` so PostgREST picks up the new privileges.

**Application order is fixed:** migration 1 → verify → migration 2 → verify.
Migration 2 rewrites grants that migration 1's policy subqueries depend on, so
applying it first would make a regression hard to attribute.

### Safety notes for applying

- Each file is wrapped in `begin;` / `commit;`; a failure rolls back cleanly.
- In the Supabase SQL Editor, **only the selected text runs**. Clear the
  selection or Ctrl+A before running.
- Pre-flight and post-apply verification queries are embedded as comments in
  each file.

## 9. Validation status

`npm test` — 89 passing across 15 suites. `npm run typecheck` — pass.
`npm run build` — pass, all routes generated. Requires `npm ci` first in a
fresh sandbox.

## 10. Outstanding work

1. Confirm migration 1 with the five-value query, then browser-check that
   `/tours/admin/guides` shows applicant names and that a draft package's stops
   read back and submit.
2. Switch `submitPackageForReview` to the atomic `submit_package_for_review`
   RPC — only after migration 1 is confirmed, since the RPC does not exist
   until then.
3. Apply and verify migration 2; the post-apply `aclexplode` grant query should
   show 8 ACL-bearing columns and no restricted column for `anon` or
   `authenticated`.
4. Live authenticated browser E2E for the operator and guide flows — deferred by
   the product owner.
5. The `42703` undefined-column error should be resolved by the schema
   alignment but was never reproduced against a live request.
6. Package media upload is not implemented: `PACKAGE_STORAGE_BUCKET` is
   declared but unused and `cover_image_url` / `gallery_urls` store
   operator-supplied references.

## 11. Hard-won gotchas

- **Jest path patterns are regexes.** `(subsystems)` becomes a capture group, so
  `npx jest "src/app/(subsystems)/..."` silently matches nothing. Use
  `npm test`.
- **Supabase SQL Editor runs only selected text.**
- **RLS returns an empty set, not an error.** This silently masked two real
  bugs (stops reads and admin profile reads). Never treat `[]` as "no data"
  where a query can fail; surface read errors distinctly.
- **Postgres rounds fractional values on assignment to integer columns.**
  Validate integers in the application.
- **Column privacy requires column grants; RLS cannot hide columns.** Policy
  subqueries additionally need column grants on every column they reference.
- `gh pr edit --body` fails on this repo (GraphQL Projects classic deprecation).
  Use `gh api -X PATCH repos/<owner>/<repo>/pulls/4 -F body=@file`.

## 12. Key files

- Contracts and validators: `src/lib/tours/operator-contract.ts`,
  `package-contract.ts`, `guide-contract.ts`, `package-validation.ts`,
  `operator-status.ts`, `operator-package-access.ts`, `server-auth.ts`.
- Server Actions: `src/app/(subsystems)/tours/operator/actions.ts`,
  `src/app/(subsystems)/tours/guide/actions.ts`,
  `src/app/(subsystems)/tours/operator/packages/actions.ts`.
- Package UI: `src/app/(subsystems)/tours/operator/packages/` — list page,
  `new/`, `[packageId]/`, `package-core-form.tsx`,
  `package-variants-form.tsx`, `package-stops-form.tsx`,
  `package-submit-button.tsx`, `package-status-badge.tsx`.
- Shared UI: `src/components/ui/{notice,page-frame,site-header,brand-mark}.tsx`.
- Migrations (drafts, unapplied): `supabase/migrations/`.
