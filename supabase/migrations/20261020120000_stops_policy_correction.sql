-- ============================================================================
-- Corrective: restore the intended tours_package_stops policy set
-- Status: DRAFT FOR REVIEW — NOT APPLIED. Review before running.
--
-- Why this exists
-- ---------------
-- After applying 20261017120000_module3_package_authorization.sql, the live
-- database showed SEVEN policies on tours_package_stops instead of six. Two of
-- them do not appear in any migration in this repository, and one policy from
-- migration 1 was absent:
--
--   PRESENT, NOT FROM ANY MIGRATION:
--     "Operators can manage stops"  FOR ALL, permissive, {authenticated}
--       qual and with_check: ownership only
--         (package_id IN (select p.id from tours_packages p
--                         join tours_operators o on p.operator_id = o.id
--                         where o.profile_id = auth.uid()))
--       -> NO draft gate and NO approved-accreditation gate. This lets an
--          operator INSERT/UPDATE/DELETE stops on their own published or
--          pending_review packages directly through PostgREST, bypassing admin
--          review, and lets a pending or rejected operator do the same. It
--          re-opens the exact hole migration 1 closed on tours_packages.
--
--     "Public can view stops"  SELECT, {anon,authenticated}, published only
--       -> Functionally identical to migration 1's
--          "Public views stops of published packages". Redundant duplicate.
--
--   MISSING FROM MIGRATION 1:
--     "Operator views own package stops"  SELECT, {authenticated}
--       -> Its absence was masked by the unsafe FOR ALL policy above, which
--          also grants SELECT, so operator screens still worked.
--
-- What this migration does
-- ------------------------
-- 1. Drops the unsafe FOR ALL policy.
-- 2. Drops the redundant duplicate public SELECT.
-- 3. Recreates the missing own-stops SELECT exactly as migration 1 defines it.
--
-- The SECURITY DEFINER RPCs (replace_package_stops, submit_package_for_review)
-- bypass RLS, so dropping the FOR ALL policy does not affect the sanctioned
-- write path. Writes continue to be allowed only through the three granular
-- "Approved operator ... own draft package stops" policies, which enforce
-- ownership, approved accreditation, and draft status.
--
-- Apply BEFORE 20261017130000_operator_document_privacy.sql so that the stops
-- table is in its intended state before column grants change.
-- ============================================================================

begin;

-- 1. Remove the ownership-only FOR ALL policy. Until this is dropped, any
--    authenticated operator can modify stops on non-draft packages directly.
drop policy if exists "Operators can manage stops"
  on public.tours_package_stops;

-- 2. Remove the duplicate public read policy; migration 1's
--    "Public views stops of published packages" already covers it.
drop policy if exists "Public can view stops"
  on public.tours_package_stops;

-- 3. Restore the least-privilege read policy for the owning operator: own
--    stops at any package status, read-only.
create policy "Operator views own package stops"
  on public.tours_package_stops
  for select
  to authenticated
  using (
    package_id in (
      select p.id
      from public.tours_packages p
      join public.tours_operators o on o.id = p.operator_id
      where o.profile_id = auth.uid()
    )
  );

commit;

-- ============================================================================
-- POST-APPLY VERIFICATION
-- ============================================================================
-- The table must show exactly these six policies and nothing else:
--   select policyname, cmd, roles::text
--   from pg_policies
--   where schemaname = 'public' and tablename = 'tours_package_stops'
--   order by policyname;
--
-- Expected:
--   Admin manages all package stops                          ALL     {authenticated}
--   Approved operator deletes own draft package stops        DELETE  {authenticated}
--   Approved operator inserts own draft package stops        INSERT  {authenticated}
--   Approved operator updates own draft package stops        UPDATE  {authenticated}
--   Operator views own package stops                         SELECT  {authenticated}
--   Public views stops of published packages                 SELECT  {public}
--
-- Functional re-check as a signed-in APPROVED operator:
--   * open a DRAFT package: saved stops must still render and save
--   * open a PUBLISHED or PENDING package: stops must render read-only and
--     saving must fail (the granular policies only permit drafts)
-- And the five-value status query in docs/project-context.md should now read
-- stops_policies = 6.
-- ============================================================================
