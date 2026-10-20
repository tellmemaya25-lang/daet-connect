-- Database State Verification Script
-- Run this in Supabase SQL Editor to confirm migration status
-- Expected signature after all migrations: 6 / 0 / 1 / 1 / 8

-- =============================================================================
-- SIGNATURE CHECK (Quick Overview)
-- =============================================================================
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

-- Expected result: 6 / 0 / 1 / 1 / 8
-- Interpretation:
-- - 6 stops policies (migration 1 + correction)
-- - 0 old unrestricted owner policies (migration 1 replaced them)
-- - 1 admin profiles policy (migration 1)
-- - 1 submit_package_for_review RPC (migration 1)
-- - 8 column ACLs on tours_operators (migration 2)

-- =============================================================================
-- DETAILED POLICY LISTING
-- =============================================================================

-- Tours Package Stops Policies (should have exactly 6)
select 'STOPS POLICIES' as section, policyname, cmd, roles::text, qual::text as using_clause
from pg_policies
where schemaname = 'public' and tablename = 'tours_package_stops'
order by policyname;

-- Tours Packages Policies (should have new draft-gated ones, not old unrestricted)
select 'PACKAGES POLICIES' as section, policyname, cmd, roles::text, qual::text as using_clause
from pg_policies
where schemaname = 'public' and tablename = 'tours_packages'
order by policyname;

-- Tours Package Price Variants Policies
select 'VARIANTS POLICIES' as section, policyname, cmd, roles::text, qual::text as using_clause
from pg_policies
where schemaname = 'public' and tablename = 'tours_package_price_variants'
order by policyname;

-- Profiles Policies (should include admin policy)
select 'PROFILES POLICIES' as section, policyname, cmd, roles::text, qual::text as using_clause
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;

-- Tours Operators Policies
select 'OPERATORS POLICIES' as section, policyname, cmd, roles::text, qual::text as using_clause
from pg_policies
where schemaname = 'public' and tablename = 'tours_operators'
order by policyname;

-- =============================================================================
-- COLUMN-LEVEL GRANTS VERIFICATION (Migration 2)
-- =============================================================================

-- Tours Operators Column Grants
select 
  'OPERATORS COLUMN GRANTS' as section,
  attname as column_name,
  array_to_string(attacl, E'\n') as grants
from pg_attribute
where attrelid = 'public.tours_operators'::regclass
  and attnum > 0 
  and not attisdropped
  and attacl is not null
order by attnum;

-- Expected columns with grants (8 total):
-- id, business_name, business_description, business_address, 
-- accreditation_status, created_at, updated_at, profile_id
--
-- Expected grants:
-- - anon gets SELECT on: id, business_name, business_description, business_address, accreditation_status, created_at, updated_at
-- - authenticated gets SELECT on all of the above PLUS profile_id
-- - Neither role sees: dti_registration_url, business_permit_url, gcash_qr_url, 
--   contact_email, contact_phone, contact_person, accreditation_notes, reviewed_by, reviewed_at

-- =============================================================================
-- RPC VERIFICATION
-- =============================================================================

-- List all tour-related RPCs
select 
  'RPCs' as section,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  p.prosecdef as is_security_definer,
  p.proowner::regrole as owner
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_my_role',
    'replace_package_price_variants',
    'replace_package_stops',
    'submit_package_for_review'
  )
order by p.proname;

-- All should be SECURITY DEFINER, owned by postgres

-- =============================================================================
-- DATA INTEGRITY CHECKS
-- =============================================================================

-- Check for negative prices (migration 1 added constraint)
select 'NEGATIVE PRICES' as check, count(*) as violations
from tours_package_price_variants
where (price_per_pax is not null and price_per_pax < 0)
   or (flat_price is not null and flat_price < 0);

-- Check for invalid pax ranges
select 'INVALID PAX RANGES' as check, count(*) as violations
from tours_package_price_variants
where min_pax < 1 
   or (max_pax is not null and max_pax < min_pax);

-- Check for packages with multiple default variants
select 'MULTIPLE DEFAULTS' as check, package_id, count(*) as default_count
from tours_package_price_variants
where is_default = true
group by package_id
having count(*) > 1;

-- Check for packages with no default variant
select 'NO DEFAULT' as check, p.id as package_id, p.title
from tours_packages p
left join tours_package_price_variants v on v.package_id = p.id and v.is_default = true
where p.status != 'draft'
group by p.id, p.title
having count(v.id) = 0;

-- Check for duplicate stop orders
select 'DUPLICATE STOP ORDERS' as check, package_id, stop_order, count(*) as duplicates
from tours_package_stops
group by package_id, stop_order
having count(*) > 1;

-- =============================================================================
-- TEST DATA SUMMARY
-- =============================================================================

-- Pending guide applications (for Test 1)
select 'PENDING GUIDES' as section, count(*) as count
from tours_guides
where accreditation_status = 'pending';

-- Pending operator applications (for Test 2)
select 'PENDING OPERATORS' as section, count(*) as count
from tours_operators
where accreditation_status = 'pending';

-- Draft packages with stops (for Test 3)
select 'DRAFT PACKAGES WITH STOPS' as section, count(distinct p.id) as count
from tours_packages p
join tours_package_stops s on s.package_id = p.id
where p.status = 'draft';

-- Non-draft packages (for Test 4)
select 'NON-DRAFT PACKAGES' as section, status, count(*) as count
from tours_packages
where status != 'draft'
group by status;

-- =============================================================================
-- FOREIGN POLICY DETECTION (Drift Channel Audit)
-- =============================================================================

-- Check for any stops policies NOT defined in this repository
-- (These were the cause of the correction migration)
select 
  'UNRECOGNIZED STOPS POLICIES' as section,
  policyname,
  cmd,
  'Should this policy exist?' as question
from pg_policies
where schemaname = 'public' 
  and tablename = 'tours_package_stops'
  and policyname not in (
    'Operator views own package stops',
    'Operator manages own package stops (insert)',
    'Operator manages own package stops (update)',
    'Operator manages own package stops (delete)',
    'Public views published package stops',
    'Admin manages all package stops'
  );

-- If any rows returned, investigate where they came from

-- =============================================================================
-- SECURITY VERIFICATION
-- =============================================================================

-- Check that anon/authenticated don't have dangerous table grants
select 
  'TABLE GRANTS' as section,
  grantee,
  privilege_type,
  'tours_operators' as table_name
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'tours_operators'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
order by grantee, privilege_type;

-- Should return empty after grant cleanup (if migrations include that)

-- =============================================================================
-- COMPLETION STATUS
-- =============================================================================

select 
  '=== VERIFICATION COMPLETE ===' as status,
  case 
    when (
      (select count(*) from pg_policies where schemaname = 'public' and tablename = 'tours_package_stops') = 6
      and (select count(*) from pg_policies where schemaname = 'public' and policyname in ('Operator manages own packages', 'Operator manages own package pricing')) = 0
      and (select count(*) from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Admin views all profiles') = 1
      and (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'submit_package_for_review') = 1
      and (select count(*) from pg_attribute where attrelid = 'public.tours_operators'::regclass and attnum > 0 and not attisdropped and attacl is not null) = 8
    )
    then 'ALL MIGRATIONS APPLIED ✓'
    else 'MIGRATION MISMATCH - Review output above'
  end as migration_status;
