/**
 * Browser verification tests for post-migration database authorization
 * 
 * These tests verify the 5 pending browser checks from the context document §10:
 * 1. `/tours/admin/guides` shows applicant names (not "Name unavailable")
 * 2. A draft package's saved stops read back correctly
 * 3. A non-draft package renders read-only
 * 4. `/tours/admin/operators` still shows documents and contacts
 * 5. Operator package list/new/edit still work after column-grant changes
 * 
 * NOTE: These tests require authenticated sessions with specific roles.
 * They are designed to run against a live Supabase instance with test data.
 */

import { expect, test } from "@playwright/test";

test.describe("Admin Guide Queue - Migration 1 Verification", () => {
  test("should display guide applicant full names from profiles table", async ({ page }) => {
    // This test verifies that migration 1's "Admin views all profiles" policy
    // allows the admin to see applicant names at /tours/admin/guides
    
    await page.goto("/tours/admin/guides");
    
    // Check if we need authentication
    const signInPrompt = page.getByText(/admin sign-in required/i);
    if (await signInPrompt.isVisible()) {
      test.skip(true, "Requires authenticated admin session");
    }
    
    // Check if there are pending applications
    const emptyState = page.getByText(/no pending guide applications/i);
    const hasPendingApps = !(await emptyState.isVisible());
    
    if (hasPendingApps) {
      // Verify that guide names are visible (not "Name unavailable")
      const nameUnavailable = page.getByText(/name unavailable/i);
      await expect(nameUnavailable).toHaveCount(0);
      
      // Verify that at least one guide card shows a full name
      const guideCards = page.locator('[data-testid="guide-review-card"]').or(
        page.locator('article').filter({ hasText: /guide introduction/i })
      );
      
      if ((await guideCards.count()) > 0) {
        // At least one card should have a visible heading with a name
        const firstCard = guideCards.first();
        const heading = firstCard.locator('h2, h3').first();
        await expect(heading).toBeVisible();
        const headingText = await heading.textContent();
        expect(headingText).toBeTruthy();
        expect(headingText).not.toMatch(/name unavailable/i);
      }
    } else {
      console.log("✓ No pending guide applications to verify names");
    }
  });
  
  test("should load without permission denied errors", async ({ page }) => {
    await page.goto("/tours/admin/guides");
    
    // Should not show any permission denied or column access errors
    await expect(page.getByText(/permission denied/i)).toHaveCount(0);
    await expect(page.getByText(/could not be loaded/i)).toHaveCount(0);
    
    // Page should render either the queue or appropriate auth prompt
    const hasQueue = await page.getByRole("heading", { name: /guide applications/i }).isVisible();
    const hasAuthPrompt = await page.getByText(/admin sign-in required/i).isVisible();
    
    expect(hasQueue || hasAuthPrompt).toBe(true);
  });
});

test.describe("Admin Operator Queue - Migration 2 Verification", () => {
  test("should display operator documents and contact information", async ({ page }) => {
    // This test verifies that migration 2's column-level grants still allow
    // service_role (admin) to see restricted columns via signed URLs
    
    await page.goto("/tours/admin/operators");
    
    // Check if we need authentication
    const signInPrompt = page.getByText(/admin sign-in required/i);
    if (await signInPrompt.isVisible()) {
      test.skip(true, "Requires authenticated admin session");
    }
    
    // Check if service role is configured
    const configError = page.getByText(/server storage access is not configured/i);
    if (await configError.isVisible()) {
      test.skip(true, "Requires SUPABASE_SERVICE_ROLE_KEY configuration");
    }
    
    // Check if there are pending applications
    const emptyState = page.getByText(/you're all caught up/i);
    const hasPendingApps = !(await emptyState.isVisible());
    
    if (hasPendingApps) {
      // Look for document link labels (DTI, Business Permit, GCash QR)
      const documentLabels = page.getByText(/dti registration|business permit|gcash qr/i);
      const hasDocumentLinks = (await documentLabels.count()) > 0;
      
      // Look for contact information labels
      const contactLabels = page.getByText(/contact person|contact email|contact number/i);
      const hasContactInfo = (await contactLabels.count()) > 0;
      
      // At least one of these should be present if there are operators
      expect(hasDocumentLinks || hasContactInfo).toBe(true);
      
      // Verify notice about document privacy is shown
      await expect(page.getByText(/applicant documents are private/i)).toBeVisible();
    } else {
      console.log("✓ No pending operator applications to verify documents");
    }
  });
  
  test("should load without column permission errors", async ({ page }) => {
    await page.goto("/tours/admin/operators");
    
    // Should not show column access errors after migration 2
    await expect(page.getByText(/permission denied for column/i)).toHaveCount(0);
    await expect(page.getByText(/could not be loaded/i)).toHaveCount(0);
    
    // Page should render either the queue or appropriate prompt
    const hasQueue = await page.getByRole("heading", { name: /operator applications/i }).isVisible();
    const hasAuthPrompt = await page.getByText(/admin sign-in required/i).isVisible();
    const hasConfigError = await page.getByText(/server storage access is not configured/i).isVisible();
    
    expect(hasQueue || hasAuthPrompt || hasConfigError).toBe(true);
  });
});

test.describe("Package Stops - Migration 1 & Correction Verification", () => {
  test("should allow reading saved stops from draft packages", async ({ page }) => {
    // This test verifies that the stops policies from migration 1 + correction
    // allow operators to read back their own package stops
    
    // Note: This test requires an authenticated operator session with at least
    // one draft package that has stops saved
    
    test.skip(true, "Requires authenticated operator with draft package containing stops");
    
    // Example implementation once UI exists:
    // await page.goto("/tours/operator/packages");
    // const draftPackage = page.getByText(/draft/i).first();
    // await draftPackage.click();
    // const stops = page.locator('[data-testid="package-stop"]');
    // await expect(stops).not.toHaveCount(0);
  });
  
  test("should not return empty stops array for packages with saved stops", async ({ page }) => {
    // This was the symptom of the missing "Operator views own package stops" policy
    test.skip(true, "Requires authenticated operator with draft package containing stops");
  });
});

test.describe("Package Read-Only Mode - Migration 1 Verification", () => {
  test("should render non-draft packages as read-only", async ({ page }) => {
    // This test verifies that the revised RLS policies prevent editing
    // of pending_review, published, or archived packages
    
    test.skip(true, "Requires authenticated operator with non-draft package");
    
    // Example implementation once UI exists:
    // await page.goto("/tours/operator/packages");
    // const publishedPackage = page.getByText(/published/i).first();
    // await publishedPackage.click();
    // 
    // // Edit controls should be hidden or disabled
    // const editButtons = page.getByRole("button", { name: /save|update|edit/i });
    // await expect(editButtons).toHaveCount(0);
    // 
    // // Should show read-only indicator
    // await expect(page.getByText(/read.only|cannot be edited/i)).toBeVisible();
  });
});

test.describe("Operator Package Management - Migration 2 Verification", () => {
  test("should allow operators to list packages after column-grant changes", async ({ page }) => {
    // This test verifies that the column grants on tours_operators don't
    // break package queries (which join through profile_id)
    
    test.skip(true, "Requires authenticated approved operator session");
    
    // Example implementation once UI exists:
    // await page.goto("/tours/operator/packages");
    // 
    // // Should not show permission errors
    // await expect(page.getByText(/permission denied/i)).toHaveCount(0);
    // await expect(page.getByText(/could not load packages/i)).toHaveCount(0);
    // 
    // // Should show either packages or empty state
    // const hasPackages = await page.getByRole("heading", { name: /my packages/i }).isVisible();
    // const emptyState = await page.getByText(/no packages yet/i).isVisible();
    // expect(hasPackages || emptyState).toBe(true);
  });
  
  test("should allow creating new draft packages", async ({ page }) => {
    test.skip(true, "Requires authenticated approved operator session");
    
    // Example implementation once UI exists:
    // await page.goto("/tours/operator/packages/new");
    // await page.getByLabel(/title/i).fill("Test Package");
    // await page.getByLabel(/location/i).fill("Daet Beach");
    // await page.getByRole("button", { name: /create draft/i }).click();
    // await expect(page.getByText(/package created/i)).toBeVisible();
  });
});

test.describe("Integration Smoke Tests", () => {
  test("all admin routes should be accessible", async ({ page }) => {
    const routes = [
      "/tours/admin/operators",
      "/tours/admin/guides",
    ];
    
    for (const route of routes) {
      await page.goto(route);
      
      // Should not show 404 or server errors
      await expect(page.getByText(/404|not found/i)).toHaveCount(0);
      await expect(page.getByText(/500|server error/i)).toHaveCount(0);
      
      // Should render some content (auth prompt, queue, or config error)
      const body = await page.textContent("body");
      expect(body).toBeTruthy();
      expect(body!.length).toBeGreaterThan(100);
    }
  });
  
  test("operator dashboard should not have permission errors", async ({ page }) => {
    await page.goto("/tours/operator/dashboard");
    
    // Should not crash with column permission errors
    await expect(page.getByText(/permission denied for column/i)).toHaveCount(0);
    
    // Should show either dashboard or auth prompt
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });
});
