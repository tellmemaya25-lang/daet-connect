/**
 * Browser Test Helpers
 * 
 * Copy and paste these into your browser's DevTools console
 * to manually test Server Actions when UI components don't exist yet.
 * 
 * Usage:
 * 1. Open your browser and navigate to the app (http://localhost:3000)
 * 2. Open DevTools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste the relevant helper below
 * 
 * Prerequisites:
 * - Must be signed in with appropriate role
 * - Development server must be running
 */

// =============================================================================
// Test 3: Verify Draft Package Stops Read Back
// =============================================================================

/**
 * Test stops read/write for a draft package
 * Replace 'YOUR-PACKAGE-UUID' with an actual draft package ID
 */
async function testDraftPackageStops() {
  const packageId = 'YOUR-PACKAGE-UUID'; // Replace this!
  
  console.log('🧪 Testing draft package stops...');
  
  // Import the actions
  const actions = await import('/src/app/(subsystems)/tours/operator/packages/actions');
  
  // First, try to read the package detail (includes stops)
  console.log('📖 Reading package detail...');
  const detailResult = await actions.getPackageDetail(packageId);
  
  if (!detailResult.success) {
    console.error('❌ Failed to read package:', detailResult.error);
    return;
  }
  
  console.log('✅ Package loaded:', detailResult.data);
  console.log('📍 Current stops:', detailResult.data?.tours_package_stops || []);
  
  const currentStops = detailResult.data?.tours_package_stops || [];
  
  if (currentStops.length === 0) {
    console.log('💡 No stops found. Let\'s add some test stops...');
    
    // Add test stops
    const testStops = [
      {
        locationName: 'Bagasbas Beach',
        latitude: 14.1234,
        longitude: 122.9876,
        description: 'Famous surfing spot',
        estimatedDurationMinutes: 120,
      },
      {
        locationName: 'Magang River',
        latitude: 14.1567,
        longitude: 122.9543,
        description: 'Scenic river cruise',
        estimatedDurationMinutes: 90,
      },
    ];
    
    console.log('💾 Saving test stops...');
    const saveResult = await actions.replacePackageStops(packageId, testStops);
    
    if (!saveResult.success) {
      console.error('❌ Failed to save stops:', saveResult.error);
      return;
    }
    
    console.log('✅ Stops saved successfully!');
    
    // Re-read to verify
    console.log('🔄 Re-reading package to verify stops...');
    const verifyResult = await actions.getPackageDetail(packageId);
    
    if (!verifyResult.success) {
      console.error('❌ Failed to re-read package:', verifyResult.error);
      return;
    }
    
    const savedStops = verifyResult.data?.tours_package_stops || [];
    console.log('📍 Saved stops:', savedStops);
    
    if (savedStops.length === 0) {
      console.error('❌ BUG: Stops were saved but cannot be read back!');
      console.error('This indicates the "Operator views own package stops" policy is missing.');
    } else {
      console.log('✅ SUCCESS: Stops read back correctly!');
      console.log(`Found ${savedStops.length} stops in correct order.`);
    }
  } else {
    console.log(`✅ Package already has ${currentStops.length} stops. Read succeeded!`);
  }
}

// Run it:
// testDraftPackageStops();

// =============================================================================
// Test 4: Verify Non-Draft Package is Read-Only
// =============================================================================

/**
 * Test that non-draft packages cannot be edited
 * Replace 'YOUR-PACKAGE-UUID' with a pending_review/published package ID
 */
async function testNonDraftReadOnly() {
  const packageId = 'YOUR-PACKAGE-UUID'; // Replace with non-draft package!
  
  console.log('🧪 Testing non-draft package read-only enforcement...');
  
  const actions = await import('/src/app/(subsystems)/tours/operator/packages/actions');
  
  // Read the package first to check status
  console.log('📖 Reading package...');
  const detailResult = await actions.getPackageDetail(packageId);
  
  if (!detailResult.success) {
    console.error('❌ Failed to read package:', detailResult.error);
    return;
  }
  
  const status = detailResult.data?.status;
  console.log('📦 Package status:', status);
  
  if (status === 'draft') {
    console.warn('⚠️  This package is still a draft. You need a non-draft package for this test.');
    console.log('💡 Submit it for review first, or use a published package.');
    return;
  }
  
  // Try to edit it (should fail)
  console.log('🔧 Attempting to edit non-draft package (should fail)...');
  const editResult = await actions.updatePackageCore(packageId, {
    title: 'HACKED TITLE - Should Not Work',
    description: 'This should be blocked',
    locationName: 'Test Location',
    durationValue: 2,
    durationType: 'hours',
    inclusions: ['Test'],
    exclusions: [],
    coverImageUrl: null,
    galleryUrls: [],
  });
  
  if (editResult.success) {
    console.error('❌ SECURITY ISSUE: Non-draft package was edited!');
    console.error('The RLS policies are not preventing edits to non-draft packages.');
  } else {
    console.log('✅ SUCCESS: Edit was blocked as expected!');
    console.log('Error message:', editResult.error);
    
    if (editResult.error.includes('cannot be edited')) {
      console.log('✅ Correct error message returned.');
    } else {
      console.warn('⚠️  Edit was blocked, but error message is unexpected.');
    }
  }
}

// Run it:
// testNonDraftReadOnly();

// =============================================================================
// Test 5: Verify Operator Package List Works After Column Grants
// =============================================================================

/**
 * Test that package listing works after migration 2's column-level grants
 */
async function testPackageListAfterMigration() {
  console.log('🧪 Testing package list after column-grant migration...');
  
  const actions = await import('/src/app/(subsystems)/tours/operator/packages/actions');
  
  console.log('📋 Fetching operator packages...');
  const listResult = await actions.listOperatorPackages();
  
  if (!listResult.success) {
    console.error('❌ Failed to list packages:', listResult.error);
    
    if (listResult.error.includes('permission denied for column')) {
      console.error('❌ MIGRATION ISSUE: Column grants are too restrictive!');
      console.error('The profile_id column must be granted to authenticated role.');
    }
    return;
  }
  
  console.log('✅ Package list loaded successfully!');
  console.log(`Found ${listResult.data?.length || 0} packages.`);
  
  if (listResult.data && listResult.data.length > 0) {
    console.log('📦 First package:', listResult.data[0]);
  } else {
    console.log('💡 No packages found. This is OK for a new operator.');
  }
}

// Run it:
// testPackageListAfterMigration();

// =============================================================================
// Create Test Draft Package
// =============================================================================

/**
 * Create a test draft package for testing
 */
async function createTestPackage() {
  console.log('🧪 Creating test draft package...');
  
  const actions = await import('/src/app/(subsystems)/tours/operator/packages/actions');
  
  const testPackage = {
    title: 'Test Package - Browser Verification',
    description: 'This is a test package created for browser verification testing.',
    locationName: 'Daet, Camarines Norte',
    durationValue: 4,
    durationType: 'hours',
    inclusions: ['Tour guide', 'Transportation', 'Snacks'],
    exclusions: ['Personal expenses', 'Travel insurance'],
    coverImageUrl: null,
    galleryUrls: [],
  };
  
  const result = await actions.createPackage(testPackage);
  
  if (!result.success) {
    console.error('❌ Failed to create package:', result.error);
    return null;
  }
  
  console.log('✅ Package created successfully!');
  console.log('Package ID:', result.data?.packageId);
  console.log('💡 Use this ID in the other test functions.');
  
  return result.data?.packageId;
}

// Run it:
// const packageId = await createTestPackage();

// =============================================================================
// Submit Package for Review
// =============================================================================

/**
 * Submit a draft package for review (changes status to pending_review)
 * First add variants and stops, then call this
 */
async function submitTestPackage(packageId) {
  console.log('🧪 Submitting package for review...');
  
  const actions = await import('/src/app/(subsystems)/tours/operator/packages/actions');
  
  // First, let's add variants and stops so submission doesn't fail validation
  
  // Add a price variant
  console.log('💰 Adding price variant...');
  const variantResult = await actions.replacePriceVariants(packageId, [
    {
      variantName: 'Standard',
      minPax: 2,
      maxPax: 10,
      pricePerPax: 500,
      flatPrice: null,
      isDefault: true,
    },
  ]);
  
  if (!variantResult.success) {
    console.error('❌ Failed to add variant:', variantResult.error);
    return;
  }
  
  console.log('✅ Variant added');
  
  // Add stops
  console.log('📍 Adding stops...');
  const stopsResult = await actions.replacePackageStops(packageId, [
    {
      locationName: 'Starting Point',
      latitude: 14.1234,
      longitude: 122.9876,
      description: 'Meet here',
      estimatedDurationMinutes: 30,
    },
  ]);
  
  if (!stopsResult.success) {
    console.error('❌ Failed to add stops:', stopsResult.error);
    return;
  }
  
  console.log('✅ Stops added');
  
  // Now submit
  console.log('📤 Submitting package...');
  const submitResult = await actions.submitPackageForReview(packageId);
  
  if (!submitResult.success) {
    console.error('❌ Failed to submit:', submitResult.error);
    return;
  }
  
  console.log('✅ Package submitted for review!');
  console.log('💡 This package should now be read-only. Test with testNonDraftReadOnly()');
}

// Run it:
// await submitTestPackage('YOUR-PACKAGE-UUID');

// =============================================================================
// All-in-One Test Runner
// =============================================================================

/**
 * Run all tests in sequence
 */
async function runAllTests() {
  console.log('🚀 Running all browser verification tests...\n');
  
  // Test 5: Package list
  await testPackageListAfterMigration();
  console.log('\n---\n');
  
  // Create a test package
  console.log('Creating test package for remaining tests...');
  const packageId = await createTestPackage();
  
  if (!packageId) {
    console.error('Cannot continue without a package ID');
    return;
  }
  
  console.log('\n---\n');
  
  // Test 3: Stops read/write
  console.log('Manually update the packageId in testDraftPackageStops() and run it.');
  
  console.log('\n---\n');
  
  // Submit for review
  console.log('To test read-only mode, run:');
  console.log(`await submitTestPackage('${packageId}')`);
  
  console.log('\n✅ Interactive tests ready. Follow the prompts above.');
}

// Run everything:
// await runAllTests();

console.log('✅ Browser test helpers loaded!');
console.log('📚 Available functions:');
console.log('  - testDraftPackageStops()');
console.log('  - testNonDraftReadOnly()');
console.log('  - testPackageListAfterMigration()');
console.log('  - createTestPackage()');
console.log('  - submitTestPackage(packageId)');
console.log('  - runAllTests()');
console.log('\n💡 Replace YOUR-PACKAGE-UUID with actual package IDs before running.');
