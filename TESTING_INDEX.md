# DAET-CONNECT Browser Verification — Testing Index

**Purpose**: Navigate all testing documentation and resources  
**Status**: Ready for execution  
**Date**: 2026-10-20

---

## 📖 Start Here

### New to Browser Verification?
👉 **Start with**: [`BROWSER_VERIFICATION_README.md`](./BROWSER_VERIFICATION_README.md)  
Full guide covering all testing approaches, troubleshooting, and success criteria.

### Need Quick Reference?
👉 **Start with**: [`VERIFICATION_QUICK_REFERENCE.md`](./VERIFICATION_QUICK_REFERENCE.md)  
One-page card with SQL check, 5 tests, DevTools snippets, and common failures.

### Ready to Test?
👉 **Start with**: [`BROWSER_VERIFICATION_CHECKLIST.md`](./BROWSER_VERIFICATION_CHECKLIST.md)  
Step-by-step manual testing guide with prerequisites and expected results.

---

## 📁 All Documentation Files

### Core Documentation
| File | Purpose | When to Use |
|------|---------|-------------|
| [`BROWSER_VERIFICATION_README.md`](./BROWSER_VERIFICATION_README.md) | Complete testing guide | First-time setup, troubleshooting |
| [`BROWSER_VERIFICATION_CHECKLIST.md`](./BROWSER_VERIFICATION_CHECKLIST.md) | Manual test checklist | Executing manual browser tests |
| [`VERIFICATION_QUICK_REFERENCE.md`](./VERIFICATION_QUICK_REFERENCE.md) | Quick reference card | Rapid validation, daily use |
| [`TESTING_INDEX.md`](./TESTING_INDEX.md) | This file | Finding the right document |

### Test Assets
| File | Purpose | When to Use |
|------|---------|-------------|
| [`src/app/(subsystems)/tours/admin/browser-verification.e2e.spec.ts`](./src/app/(subsystems)/tours/admin/browser-verification.e2e.spec.ts) | Automated E2E tests | CI/CD, automated testing |
| [`scripts/verify-database-state.sql`](./scripts/verify-database-state.sql) | Database verification | Confirming migrations applied |
| [`scripts/browser-test-helpers.js`](./scripts/browser-test-helpers.js) | DevTools console tests | Testing Server Actions directly |

### Tracking
| File | Purpose | When to Use |
|------|---------|-------------|
| [`.verification-status.md`](./.verification-status.md) | Test execution tracker | Recording test results |

---

## 🎯 The 5 Tests to Run

Detailed in all documentation above:

1. **Test 1**: Admin sees guide applicant names (not "Name unavailable")
2. **Test 2**: Admin sees operator documents and contact info
3. **Test 3**: Draft package stops read back after save
4. **Test 4**: Non-draft packages render read-only
5. **Test 5**: Package CRUD operations work after column grants

---

## 🚀 Testing Approaches

### Approach 1: SQL Verification Only (Fastest)
**Time**: 2 minutes  
**What**: Confirms migrations applied correctly  
**File**: `scripts/verify-database-state.sql`  
**Use when**: Quick sanity check before browser testing

### Approach 2: Manual Browser Testing (Comprehensive)
**Time**: 15-30 minutes  
**What**: Real user flows with test accounts  
**File**: `BROWSER_VERIFICATION_CHECKLIST.md`  
**Use when**: First verification run, before deployment

### Approach 3: DevTools Console Testing (Technical)
**Time**: 10 minutes  
**What**: Direct Server Action testing  
**File**: `scripts/browser-test-helpers.js`  
**Use when**: UI doesn't exist yet, debugging issues

### Approach 4: Automated E2E (Continuous)
**Time**: 5 minutes  
**What**: Playwright automated tests  
**Command**: `npm run test:e2e:verification`  
**Use when**: CI/CD pipeline, regression testing

---

## 📊 Test Matrix

| Test | Admin | Operator | SQL | E2E | DevTools | Manual |
|------|-------|----------|-----|-----|----------|--------|
| T1: Guide names | ✓ | | ✓ | ✓ | | ✓ |
| T2: Operator docs | ✓ | | ✓ | ✓ | | ✓ |
| T3: Stops read | | ✓ | ✓ | | ✓ | ✓ |
| T4: Read-only | | ✓ | ✓ | | ✓ | ✓ |
| T5: Package CRUD | | ✓ | ✓ | | ✓ | ✓ |

**Legend**: ✓ = Available in this method

---

## 🔍 Quick Command Reference

### Start Development
```bash
npm ci --no-audit --no-fund
npm run dev
# Server: http://localhost:3000
```

### Run Tests
```bash
# All E2E tests
npm run test:e2e

# Only verification tests
npm run test:e2e:verification

# Unit tests
npm test

# Type check
npm run typecheck
```

### Database Check (Supabase SQL Editor)
```sql
-- Migration signature (expect: 6 / 0 / 1 / 1 / 8)
-- See scripts/verify-database-state.sql for full query
```

### DevTools Console (Browser)
```javascript
// Import actions
const actions = await import('/src/app/(subsystems)/tours/operator/packages/actions');

// Test package list (T5)
await actions.listOperatorPackages();

// See scripts/browser-test-helpers.js for more
```

---

## 🎓 Learning Path

### If you're new to the project:
1. Read project context document (provided separately)
2. Read `BROWSER_VERIFICATION_README.md`
3. Run SQL verification: `scripts/verify-database-state.sql`
4. Follow `BROWSER_VERIFICATION_CHECKLIST.md`

### If you're debugging a failure:
1. Check `VERIFICATION_QUICK_REFERENCE.md` common failures table
2. Run full SQL verification: `scripts/verify-database-state.sql`
3. Check browser console (F12) for detailed errors
4. Review `BROWSER_VERIFICATION_README.md` troubleshooting section

### If you're setting up CI/CD:
1. Review E2E test: `browser-verification.e2e.spec.ts`
2. Configure test accounts and credentials
3. Update `.skip()` calls to enable tests
4. Add `npm run test:e2e:verification` to pipeline

---

## 📝 Reporting Results

### During Testing
Update [`.verification-status.md`](./.verification-status.md) as you complete each test.

### After Completion
Update the project context document §10 item 2:

**If all pass:**
```markdown
2. **Done (2026-10-20): Browser verification complete.**
   All 5 tests passed without permission errors.
   Verified by: [Name], Date: [Date]
```

**If issues found:**
```markdown
2. **Partial (2026-10-20): Browser verification in progress.**
   Tests 1, 2, 5 passed. Test 3 failed: [details].
   See issue #[number] for resolution.
```

---

## 🆘 Getting Help

### Common Questions

**Q: Which file should I start with?**  
A: `VERIFICATION_QUICK_REFERENCE.md` for experienced users, `BROWSER_VERIFICATION_README.md` for first-time setup.

**Q: Tests are failing. What should I do?**  
A: Run `scripts/verify-database-state.sql` first to confirm migration state. Then check the troubleshooting section in the README.

**Q: Do I need to run all test approaches?**  
A: No. SQL verification + manual browser testing is sufficient. Other approaches are alternatives or supplements.

**Q: Can I automate everything?**  
A: Partly. E2E tests require auth configuration. DevTools tests need manual setup. SQL verification is fully automatable.

**Q: How long does full verification take?**  
A: ~30-40 minutes for first run (setup + all tests). ~10 minutes for subsequent runs.

### Need More Help?

1. Review project context document §6 (database state) and §11 (gotchas)
2. Check browser console (F12) for detailed error messages
3. Review network tab for failed API requests
4. Run full SQL verification to identify specific issues
5. Document exact error messages for issue reporting

---

## ✅ Success Checklist

Before marking verification complete, confirm:

- [ ] Database signature is `6 / 0 / 1 / 1 / 8`
- [ ] All 5 browser tests passed
- [ ] No "permission denied" errors in console
- [ ] No "Name unavailable" placeholders
- [ ] Document links visible in admin queues
- [ ] Stops array populated after save
- [ ] Non-draft packages block edits
- [ ] Package CRUD operations work
- [ ] `.verification-status.md` updated
- [ ] Project context document §10 updated

**When complete**, this verification milestone closes the pending work item from the context document.

---

## 📚 Related Documentation

- **Project Context Document**: Living context for tours subsystem
- **Migration Files**: `supabase/migrations/*.sql`
- **Server Actions**: `src/app/(subsystems)/tours/operator/packages/actions.ts`
- **Admin Pages**: `src/app/(subsystems)/tours/admin/{guides,operators}/page.tsx`

---

**Last Updated**: 2026-10-20  
**Test Suite Version**: 1.0  
**Migration Signature**: 6 / 0 / 1 / 1 / 8
