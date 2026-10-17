-- ============================================================================
-- Operator document and contact privacy: column-level access control
-- Status: DRAFT FOR REVIEW — NOT APPLIED. Review before running.
--
-- Problem
-- -------
-- The "Public can view approved operators" policy lets anon read whole rows of
-- public.tours_operators, including dti_registration_url, business_permit_url,
-- gcash_qr_url, contact_email, and contact_phone. Those are private business
-- documents and direct contact details, and they must not be public.
--
-- Why RLS cannot fix this
-- -----------------------
-- Row-level security decides WHICH ROWS a role may see; it cannot hide
-- individual COLUMNS of a visible row. Column exposure is controlled by
-- column-level GRANT/REVOKE, which is what this migration changes. Both layers
-- are needed: RLS still limits rows, grants now limit columns.
--
-- Why this is safe for the application
-- ------------------------------------
-- Every read path was checked against the source:
--   * The ONLY authenticated session-client read of tours_operators is
--     requireApprovedOperator() in
--     src/app/(subsystems)/tours/operator/packages/actions.ts, which selects
--     exactly "id,accreditation_status". Both columns stay granted.
--   * All reads of the document/contact columns already use the service-role
--     client, which bypasses RLS and column grants:
--       - src/app/(subsystems)/tours/admin/operators/page.tsx
--       - src/app/(subsystems)/tours/operator/actions.ts
--       - src/lib/tours/operator-status.ts
--     This matches the existing architecture rule that sensitive rows are read
--     server-side with service_role only.
--   * An operator's own accreditation_notes are read via
--     getOwnOperatorApplicationStatus(), which uses service_role, so the
--     applicant-facing register/pending screens are unaffected.
--
-- CRITICAL dependency preserved
-- -----------------------------
-- The tours_packages, tours_package_price_variants, and tours_package_stops
-- policies contain subqueries over tours_operators, e.g.
--   operator_id in (select o.id from tours_operators o
--                   where o.profile_id = auth.uid()
--                     and o.accreditation_status = 'approved')
-- Policy expressions execute with the INVOKING user's privileges, so
-- authenticated must keep SELECT on id, profile_id, and accreditation_status
-- or every package query fails with "permission denied for column profile_id".
-- Those three columns are therefore granted below.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Drop the table-wide SELECT, then re-grant only the public columns.
-- ----------------------------------------------------------------------------
-- The table-level grant must be revoked FIRST: column grants are additive, so
-- leaving table-level SELECT in place would still expose every column.
revoke select on table public.tours_operators from anon;
revoke select on table public.tours_operators from authenticated;

-- Public catalogue fields only. Deliberately excludes contact_person,
-- contact_phone, contact_email, the three document URLs, accreditation_notes,
-- reviewed_by, and reviewed_at.
grant select (
  id,
  business_name,
  business_description,
  business_address,
  accreditation_status,
  created_at,
  updated_at
) on table public.tours_operators to anon;

-- Same public set, plus profile_id because the tours_packages family of RLS
-- policies matches ownership through tours_operators.profile_id = auth.uid().
grant select (
  id,
  profile_id,
  business_name,
  business_description,
  business_address,
  accreditation_status,
  created_at,
  updated_at
) on table public.tours_operators to authenticated;

-- service_role and postgres keep their existing full grants; they are not
-- touched here. Admin screens must continue using service_role for the
-- restricted columns.

-- ----------------------------------------------------------------------------
-- 2. Keep INSERT/UPDATE/DELETE away from public roles
-- ----------------------------------------------------------------------------
-- Recon showed anon and authenticated hold DELETE, INSERT, REFERENCES, SELECT,
-- TRIGGER, TRUNCATE, and UPDATE on this table. RLS blocks row access, but
-- TRUNCATE is NOT covered by RLS, and the write privileges serve no purpose
-- because all operator writes go through service_role. Removing them is
-- defense in depth.
revoke insert, update, delete, truncate, references, trigger
  on table public.tours_operators from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.tours_operators from authenticated;

-- ----------------------------------------------------------------------------
-- 3. Refresh the PostgREST schema cache
-- ----------------------------------------------------------------------------
-- PostgREST caches column privileges. Without this the REST API can keep
-- serving the old behaviour until it reloads.
notify pgrst, 'reload schema';

commit;

-- ============================================================================
-- POST-APPLY VERIFICATION
-- ============================================================================
-- Confirm the effective column grants:
--   select grantee,
--          string_agg(privilege_type, ', ' order by privilege_type) as privileges,
--          string_agg(column_name, ', ' order by ordinal_position) as columns
--   from (
--     select (aclexplode(attacl)).grantee::regrole::text as grantee,
--            (aclexplode(attacl)).privilege_type as privilege_type,
--            attname as column_name,
--            attnum as ordinal_position
--     from pg_attribute
--     where attrelid = 'public.tours_operators'::regclass
--       and attnum > 0 and not attisdropped
--       and attacl is not null
--   ) x
--   group by grantee;
--
-- Confirm table-level privileges (TRUNCATE/INSERT/UPDATE/DELETE should be gone
-- for anon and authenticated):
--   select grantee, string_agg(privilege_type, ', ' order by privilege_type)
--   from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'tours_operators'
--   group by grantee order by grantee;
--
-- Regression check with the anon key (must NOT return the restricted columns):
--   curl "$SUPABASE_URL/rest/v1/tours_operators?select=*" \
--     -H "apikey: $ANON_KEY"
--   Expect a 400/permission error for the restricted columns rather than data.
--
-- Then, as a signed-in APPROVED OPERATOR in the browser, confirm the package
-- screens still work — this exercises the tours_operators subqueries inside the
-- tours_packages RLS policies:
--   * /tours/operator/packages loads the list
--   * /tours/operator/packages/new creates a draft
--   * /tours/operator/dashboard still shows the approved state
-- And as an ADMIN, confirm /tours/admin/operators still shows documents and
-- contact details (it uses service_role, so it should be unchanged).
-- ============================================================================
