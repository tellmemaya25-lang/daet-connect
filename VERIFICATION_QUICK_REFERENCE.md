# Browser Verification — Quick Reference Card

**Migration Status Check** → Run in Supabase SQL Editor:
```sql
select 'stops_policies' as check_name, count(*)::text as value
from pg_policies where schemaname = 'public' and tablename = 'tours_package_stops'
union all select 'old_unrestricted_owner_policies', count(*)::text
from pg_policies where schemaname = 'public' 
  and policyname in ('Operator manages own packages', 'Operator manages own package pricing')
union all select 'admin_profiles_policy', count(*)::text
from pg_policies where schemaname = 'public' and tablename = 'profiles' 
  and policyname = 'Admin views all profiles'
union all select 'submit_rpc_exists', count(*)::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace 
where n.nspname = 'public' and p.proname = 'submit_package_for_review'
union all select 'column_acl_columns', count(*)::text
from pg_attribute where attrelid = 'public.tours_operators'::regclass 
  and attnum > 0 and not attisdropped and attacl is not null;
```
**Expected**: `6 / 0 / 1 / 1 / 8` ✅

---

## 5 Critical Tests

### T1: Admin Guide Names
- **Route**: `/tours/admin/guides`
- **Account**: Admin
- **Pass**: Full names visible, not "Name unavailable"
- **Fail**: Check `Admin views all profiles` policy exists

### T2: Admin Operator Documents
- **Route**: `/tours/admin/operators`
- **Account**: Admin
- **Pass**: Document links (DTI, permit, GCash) visible
- **Fail**: Check service role key configured, column grants correct

### T3: Draft Package Stops Read
- **Route**: `/tours/operator/packages/[id]` OR DevTools
- **Account**: Operator
- **Pass**: Stops array populated after save
- **Fail**: Check 6 stops policies exist, including "Operator views own"

### T4: Non-Draft Read-Only
- **Route**: `/tours/operator/packages/[id]` OR DevTools
- **Account**: Operator
- **Pass**: Edit blocked with "cannot be edited" error
- **Fail**: Check old unrestricted policies = 0

### T5: Package CRUD Works
- **Route**: `/tours/operator/packages/*`
- **Account**: Operator
- **Pass**: List, create, edit work without errors
- **Fail**: Check `profile_id` granted to `authenticated`

---

## DevTools Console Quick Tests

**Open Console (F12)**, paste and run:

```javascript
// Test package listing (T5)
const actions = await import('/src/app/(subsystems)/tours/operator/packages/actions');
const result = await actions.listOperatorPackages();
console.log(result.success ? '✅ Pass' : '❌ Fail', result);

// Test stops read (T3) - replace UUID
const detail = await actions.getPackageDetail('YOUR-PACKAGE-UUID');
console.log('Stops:', detail.data?.tours_package_stops);

// Test read-only (T4) - replace UUID with non-draft
const edit = await actions.updatePackageCore('YOUR-PACKAGE-UUID', {
  title: 'HACK', locationName: 'Test', durationValue: 1, 
  durationType: 'hours', inclusions: [], exclusions: [], 
  coverImageUrl: null, galleryUrls: [], description: null
});
console.log(edit.success ? '❌ Security issue!' : '✅ Pass', edit.error);
```

---

## Common Failures

| Error | Test | Cause | Fix |
|-------|------|-------|-----|
| "Name unavailable" | T1 | Policy missing | Apply migration 1 |
| "Permission denied for column" | T2, T5 | Column grants wrong | Check migration 2 |
| Empty stops array | T3 | Policy missing | Apply correction |
| Can edit non-draft | T4 | Old policies exist | Migration 1 not applied |
| "Could not create signed URLs" | T2 | Service role key missing | Set in .env.local |

---

## Success ✅

All tests pass → Update context doc §10 item 2 to **Done**

---

**Full docs**: `BROWSER_VERIFICATION_README.md`  
**Checklist**: `BROWSER_VERIFICATION_CHECKLIST.md`  
**SQL**: `scripts/verify-database-state.sql`  
**DevTools**: `scripts/browser-test-helpers.js`
