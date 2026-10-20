# Browser Verification Checklist — Post-Migration Testing

**Status**: Ready for product owner execution  
**Date**: 2026-10-20  
**Migrations Applied**: All three (signature: `6 / 0 / 1 / 1 / 8`)

This checklist corresponds to the 5 pending browser checks from the context document §10, item 2.

---

## Prerequisites

1. ✅ All three migrations applied to live database
2. ✅ `npm ci` completed (dependencies installed)
3. ✅ `npm run build` successful
4. ✅ Development server running: `npm run dev` (or `npm run start` for production build)
5. 🔐 Three test accounts ready:
   - **Admin account** (role: `admin` in `profiles` table)
   - **Approved operator account** (role: `operator`, accreditation_status: `approved` in `tours_operators`)
   - **Guide applicant** (pending application in `tours_guides`)

---

## Test 1: Admin Guide Queue — Profile Names Visible

**Route**: `/tours/admin/guides`  
**Account**: Admin  
**Migration**: Verifies migration 1's `Admin views all profiles` policy

### Steps
1. Sign in as admin
2. Navigate to `/tours/admin/guides`
3. Observe the list of pending guide applications

### Expected Results
- ✅ Page loads without errors
- ✅ Each guide card shows the applicant's **full name** (not "Name unavailable")
- ✅ No "permission denied" or "could not be loaded" errors
- ✅ Guide introduction, contact info, and ID type are visible

### Common Issues
- ❌ "Name unavailable" → The `Admin views all profiles` policy is missing or not working
- ❌ "Could not be loaded" → Check RLS policies on `profiles` table

---

## Test 2: Admin Operator Queue — Documents & Contacts Visible

**Route**: `/tours/admin/operators`  
**Account**: Admin  
**Migration**: Verifies migration 2's column-level grants still allow service_role access

### Steps
1. Sign in as admin
2. Navigate to `/tours/admin/operators`
3. Observe the list of pending operator applications

### Expected Results
- ✅ Page loads without errors
- ✅ Each operator card shows:
  - Business name, description, address
  - Contact person, email, phone
  - **Document links** (DTI, Business Permit, GCash QR)
- ✅ Document links are clickable and expire in 10 minutes
- ✅ Privacy notice is displayed
- ✅ No "permission denied for column" errors

### Common Issues
- ❌ "Permission denied for column profile_id" → The column grants in migration 2 are incorrect
- ❌ Missing document links → Service role key not configured or Storage bucket issue
- ❌ "Server storage access is not configured" → Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

---

## Test 3: Draft Package Stops — Read Back Correctly

**Route**: `/tours/operator/packages/[packageId]` (edit page)  
**Account**: Approved operator  
**Migration**: Verifies migration 1's stops policies + correction

### Prerequisites
- Create a draft package with at least 2 map stops saved

### Steps
1. Sign in as approved operator
2. Navigate to package list page
3. Open a **draft** package that has stops saved
4. Check the map stops section

### Expected Results
- ✅ All saved stops are displayed in the correct order
- ✅ Stop names, coordinates, descriptions, and durations are visible
- ✅ Stop order matches the sequence they were saved
- ✅ No empty stops array (silent RLS failure)

### Common Issues
- ❌ Empty stops array but save succeeded → The `Operator views own package stops` policy is missing
- ❌ Cannot save stops → Check `Operator manages own package stops` policy
- ❌ Stops visible but wrong order → Check `stop_order` generation in RPC

**Note**: If package UI doesn't exist yet, test via Server Actions using browser DevTools:
```javascript
// In browser console
const { replacePackageStops, getPackageDetail } = await import('/src/app/(subsystems)/tours/operator/packages/actions');
const result = await getPackageDetail('package-uuid-here');
console.log('Stops:', result.data?.tours_package_stops);
```

---

## Test 4: Non-Draft Package — Read-Only Rendering

**Route**: `/tours/operator/packages/[packageId]` (detail page)  
**Account**: Approved operator  
**Migration**: Verifies migration 1's draft-gated UPDATE/DELETE policies

### Prerequisites
- Create a package and submit it for review (status: `pending_review`)
- Or have a `published` or `archived` package

### Steps
1. Sign in as approved operator
2. Navigate to a **non-draft** package (pending_review, published, or archived)
3. Attempt to edit core details, variants, or stops

### Expected Results
- ✅ Package displays correctly with all data
- ✅ Edit controls are hidden or disabled
- ✅ Status badge shows current state (not "Draft")
- ✅ "Cannot be edited" or similar read-only message is shown
- ✅ Attempts to save return an error like "Package cannot be edited while status is 'pending_review'"

### Common Issues
- ❌ Edit buttons still work → RLS policies not enforcing draft-only edits
- ❌ Self-publish possible → The old unrestricted policies weren't replaced

**Note**: If package UI doesn't exist yet, test via Server Actions:
```javascript
// In browser console, try to update a non-draft package
const { updatePackageCore } = await import('/src/app/(subsystems)/tours/operator/packages/actions');
const result = await updatePackageCore('non-draft-package-uuid', {
  title: 'Hacked Title',
  locationName: 'Test',
  durationValue: 2,
  durationType: 'hours',
  inclusions: [],
  exclusions: [],
  coverImageUrl: null,
  galleryUrls: [],
  description: null,
});
console.log(result); // Should return { success: false, error: "Package cannot be edited..." }
```

---

## Test 5: Operator Package Management — Post-Column-Grant Operations

**Routes**: `/tours/operator/packages`, `/tours/operator/packages/new`, `/tours/operator/packages/[packageId]`  
**Account**: Approved operator  
**Migration**: Verifies migration 2's column grants don't break package queries

### Steps
1. Sign in as approved operator
2. Navigate to `/tours/operator/packages` (list page)
3. Create a new draft package
4. Edit the package (core, variants, stops)
5. Submit for review

### Expected Results
- ✅ Package list loads without errors
- ✅ Can create new draft packages
- ✅ Can edit draft packages
- ✅ Can save variants and stops
- ✅ Can submit packages for review
- ✅ No "permission denied for column profile_id" errors (this was the §6 concern)

### Common Issues
- ❌ "Permission denied for column profile_id" → Migration 2's grants revoked too much; `id` and `profile_id` must be granted to `authenticated` for RLS policy joins
- ❌ Package queries return empty → RLS policies on `tours_packages` can't join through `tours_operators` anymore

**Note**: The `profile_id` column **must** remain granted to `authenticated` because package RLS policies match ownership through `tours_operators.profile_id = auth.uid()`.

---

## Test 6: Audit Log Verification (Manual SQL)

**Location**: Supabase SQL Editor  
**Purpose**: Verify that sensitive document access leaves audit trail

### Query
```sql
-- Check server logs for guide sensitive document access
-- (This assumes your logging implementation creates table entries)
SELECT * FROM guide_sensitive_audit 
ORDER BY timestamp DESC 
LIMIT 10;
```

### Expected Results
- If guide ID documents have been accessed via Server Action, there should be log entries
- Each entry should have: actor_id, guide_id, operation, outcome, timestamp
- No ID numbers, paths, URLs, or content should be logged

**Note**: If logging goes to console only (not a table), check server logs manually.

---

## Summary Checklist

| # | Test | Route | Role | Status |
|---|------|-------|------|--------|
| 1 | Guide names visible | `/tours/admin/guides` | Admin | ⬜ Not tested |
| 2 | Operator docs visible | `/tours/admin/operators` | Admin | ⬜ Not tested |
| 3 | Draft stops read back | `/tours/operator/packages/[id]` | Operator | ⬜ Not tested |
| 4 | Non-draft read-only | `/tours/operator/packages/[id]` | Operator | ⬜ Not tested |
| 5 | Package CRUD works | `/tours/operator/packages/*` | Operator | ⬜ Not tested |
| 6 | Audit logs | SQL Editor | Admin | ⬜ Not tested |

**Legend**: ⬜ Not tested | ✅ Pass | ❌ Fail | ⏭️ Skipped

---

## Automated E2E Tests

Run the automated Playwright tests:
```bash
npm run test:e2e
```

**Note**: The E2E tests in `browser-verification.e2e.spec.ts` are skipped by default because they require authenticated sessions. To enable them, configure test user credentials and update the `.skip()` calls.

---

## Reporting Issues

If any test fails, record:
1. Which test failed
2. The exact error message
3. Browser console logs (F12 → Console)
4. Network tab errors (F12 → Network, filter by Failed)
5. Database signature verification re-run (see context doc §6)

Report to: [Project maintainer or issue tracker]

---

## Success Criteria

All 5 browser tests pass without:
- "Permission denied" errors
- "Name unavailable" placeholders where names should show
- Missing document links
- Empty stops arrays on packages that have stops
- Ability to edit non-draft packages

Once complete, update context document §10 item 2 to "Done".
