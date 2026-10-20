# Browser Verification Testing Guide

This directory contains comprehensive browser verification tests for the DAET-CONNECT.PH tours subsystem after database migration application.

## 📋 Overview

After applying the three database migrations (Module 3 authorization + operator document privacy), we need to verify that:

1. ✅ Admin can see guide applicant names (migration 1's profile policy)
2. ✅ Admin can see operator documents and contacts (migration 2's column grants)
3. ✅ Operators can read their own package stops (migration 1 + correction)
4. ✅ Non-draft packages are read-only (migration 1's draft-gated policies)
5. ✅ Package management still works (migration 2 doesn't break joins)

## 🗂️ Test Files

### 1. `BROWSER_VERIFICATION_CHECKLIST.md`
**Purpose**: Manual testing checklist for product owner execution  
**Use when**: Running manual browser tests with real user accounts

Contains step-by-step instructions for each test case with:
- Prerequisites (accounts, test data needed)
- Expected results
- Common failure modes
- DevTools console alternatives when UI doesn't exist

### 2. `src/app/(subsystems)/tours/admin/browser-verification.e2e.spec.ts`
**Purpose**: Automated Playwright E2E tests  
**Use when**: CI/CD pipeline or automated testing

Contains automated tests that:
- Navigate to admin and operator routes
- Check for permission errors
- Verify UI elements are visible
- Currently skip tests requiring authentication (configurable)

### 3. `scripts/verify-database-state.sql`
**Purpose**: Database migration status verification  
**Use when**: Confirming migrations are applied correctly

Run in Supabase SQL Editor to check:
- Migration signature (6 / 0 / 1 / 1 / 8)
- Policy counts and names
- Column-level grants on `tours_operators`
- RPC existence and configuration
- Data integrity (no negative prices, valid pax ranges, etc.)
- Foreign policy detection (drift audit)

### 4. `scripts/browser-test-helpers.js`
**Purpose**: Interactive DevTools console testing  
**Use when**: UI components don't exist yet, testing Server Actions directly

Copy-paste into browser console to:
- Test package stops read/write
- Verify read-only enforcement
- Test package listing after column grants
- Create test packages
- Submit packages for review

## 🚀 Quick Start

### Option A: Manual Browser Testing (Recommended for first run)

1. **Verify database migrations are applied:**
   ```bash
   # Run this query in Supabase SQL Editor
   # See scripts/verify-database-state.sql, first section
   ```
   Expected result: `6 / 0 / 1 / 1 / 8`

2. **Start the development server:**
   ```bash
   npm ci --no-audit --no-fund
   npm run dev
   ```
   Server runs on http://localhost:3000

3. **Follow the checklist:**
   Open `BROWSER_VERIFICATION_CHECKLIST.md` and complete each test with the appropriate user account.

4. **Mark results:**
   Update the summary table in the checklist with ✅ (pass), ❌ (fail), or ⏭️ (skipped).

### Option B: Automated E2E Testing

1. **Configure Supabase credentials:**
   ```bash
   # Ensure .env.local has:
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Run Playwright tests:**
   ```bash
   npm run test:e2e
   ```

3. **Review results:**
   Most tests will be skipped (require authentication). To enable:
   - Update test files to remove `.skip()` calls
   - Configure test user credentials
   - Set up test data (pending guides, operators, draft packages)

### Option C: DevTools Console Testing (For Server Actions)

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Sign in as an operator** in the browser

3. **Open DevTools (F12) → Console tab**

4. **Copy and paste from `scripts/browser-test-helpers.js`:**
   ```javascript
   // Example: Test package listing
   async function testPackageListAfterMigration() {
     // ... (copy full function from helpers file)
   }
   await testPackageListAfterMigration();
   ```

5. **Follow the console output** to verify results

## 📊 Test Matrix

| Test ID | Description | Method | Auth Required | Status |
|---------|-------------|--------|---------------|--------|
| **T1** | Admin sees guide names | Manual + E2E | Admin | ⬜ |
| **T2** | Admin sees operator docs | Manual + E2E | Admin | ⬜ |
| **T3** | Draft package stops read back | Manual + DevTools | Operator | ⬜ |
| **T4** | Non-draft package read-only | Manual + DevTools | Operator | ⬜ |
| **T5** | Package CRUD works | Manual + DevTools | Operator | ⬜ |
| **T6** | Audit logs present | SQL Query | Admin | ⬜ |

**Legend**: ⬜ Not tested | ✅ Pass | ❌ Fail | ⏭️ Skipped

## 🔧 Troubleshooting

### "Name unavailable" in guide queue
**Cause**: `Admin views all profiles` policy missing  
**Fix**: Apply migration 1, verify with signature check  
**Query**:
```sql
select count(*) from pg_policies 
where tablename = 'profiles' 
  and policyname = 'Admin views all profiles';
-- Should return 1
```

### "Permission denied for column profile_id"
**Cause**: Migration 2 revoked too many columns  
**Fix**: `profile_id` must be granted to `authenticated` for RLS joins  
**Query**:
```sql
select attname, attacl 
from pg_attribute 
where attrelid = 'public.tours_operators'::regclass 
  and attname = 'profile_id';
-- Should show authenticated with SELECT grant
```

### Empty stops array despite successful save
**Cause**: `Operator views own package stops` policy missing  
**Fix**: Apply stops policy correction migration  
**Query**:
```sql
select count(*) from pg_policies 
where tablename = 'tours_package_stops';
-- Should return 6
```

### Can edit non-draft packages
**Cause**: Old unrestricted owner policies still present  
**Fix**: Migration 1 should have replaced them  
**Query**:
```sql
select count(*) from pg_policies 
where policyname in (
  'Operator manages own packages',
  'Operator manages own package pricing'
);
-- Should return 0
```

### "Could not create signed URLs" for operator documents
**Cause**: Service role key not configured or wrong bucket  
**Fix**: 
1. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
2. Verify bucket name: `tours-operator-documents` (default)
3. Check Storage policies allow service_role read access

## 📝 Reporting Results

After completing tests, update the context document:

1. Open the project context document (provided separately)
2. Navigate to §10 "Outstanding work"
3. Update item 2 "Browser checks pending" with results:

```markdown
2. **Done (2026-10-20): Browser verification complete.** 
   - ✅ Admin guide names visible
   - ✅ Admin operator documents visible
   - ✅ Draft stops read back correctly
   - ✅ Non-draft packages read-only
   - ✅ Package CRUD operations work
   All tests passed without permission errors.
```

Or if issues found:
```markdown
2. **Partial (2026-10-20): Browser verification in progress.**
   - ✅ Tests 1, 2, 5 passed
   - ❌ Test 3 failed: Stops return empty array (policy missing)
   - ⏭️ Test 4 skipped: No non-draft packages available
   See issue #123 for details.
```

## 🎯 Success Criteria

**All tests pass when:**

1. No "permission denied" errors in browser console
2. No "Name unavailable" placeholders where real names should show
3. Document links visible and working in admin operator queue
4. Stops array populated after save for draft packages
5. Edit operations blocked for non-draft packages with clear error message
6. Package listing, creation, and editing work without column access errors

**Completion milestone**: Update context document §10 item 2 to "Done"

## 🔗 Related Documentation

- **Project Context Document**: Living context for the tours subsystem
- **Migration Files**: `supabase/migrations/*.sql`
- **Server Actions**: `src/app/(subsystems)/tours/operator/packages/actions.ts`
- **Admin Pages**: `src/app/(subsystems)/tours/admin/{guides,operators}/page.tsx`

## 🆘 Need Help?

If tests fail or you're unsure about results:

1. **Run the database verification SQL** to confirm migration state
2. **Check browser console** (F12) for detailed error messages
3. **Review network tab** for failed API calls
4. **Compare with expected behavior** in the checklist
5. **Document exact error messages** for issue reporting

For questions about test setup or interpretation, refer to the project context document §10 and §11 (Hard-won gotchas).

---

**Last Updated**: 2026-10-20  
**Migration Signature**: 6 / 0 / 1 / 1 / 8 (all applied)  
**Test Suite Version**: 1.0
