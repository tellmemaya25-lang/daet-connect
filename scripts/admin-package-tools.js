/**
 * Admin tools for managing packages
 * Run with: node scripts/admin-package-tools.js [command]
 * 
 * Commands:
 *   list - List all packages
 *   approve - Approve all pending packages
 *   publish <id> - Publish a specific package
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listPackages() {
  console.log('\n📦 Fetching all packages...\n');
  
  const { data, error } = await supabase
    .from('tours_packages')
    .select('id, title, status, location_name, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('📭 No packages found.\n');
    return;
  }

  console.log(`Found ${data.length} package(s):\n`);
  data.forEach((pkg, idx) => {
    const statusEmoji = {
      draft: '📝',
      pending_review: '⏳',
      published: '✅',
      rejected: '❌',
      archived: '📦'
    }[pkg.status] || '❓';

    console.log(`${idx + 1}. ${statusEmoji} [${pkg.status.toUpperCase()}]`);
    console.log(`   ${pkg.title}`);
    console.log(`   Location: ${pkg.location_name}`);
    console.log(`   ID: ${pkg.id}`);
    console.log(`   Created: ${new Date(pkg.created_at).toLocaleDateString()}\n`);
  });
}

async function approveAllPending() {
  console.log('\n📋 Finding pending packages...\n');
  
  const { data: pending, error: fetchError } = await supabase
    .from('tours_packages')
    .select('id, title')
    .eq('status', 'pending_review');

  if (fetchError) {
    console.error('❌ Error fetching packages:', fetchError.message);
    return;
  }

  if (!pending || pending.length === 0) {
    console.log('✅ No pending packages to approve.\n');
    return;
  }

  console.log(`Found ${pending.length} pending package(s):\n`);
  pending.forEach((pkg, idx) => {
    console.log(`${idx + 1}. ${pkg.title}`);
  });

  console.log('\n🔄 Approving all...\n');

  const { data, error } = await supabase
    .from('tours_packages')
    .update({ status: 'published' })
    .eq('status', 'pending_review')
    .select();

  if (error) {
    console.error('❌ Error approving packages:', error.message);
    return;
  }

  console.log(`✅ Successfully approved ${data.length} package(s)!\n`);
}

async function publishPackage(packageId) {
  if (!packageId) {
    console.error('❌ Please provide a package ID');
    console.log('Usage: node scripts/admin-package-tools.js publish <package-id>\n');
    return;
  }

  console.log(`\n🔄 Publishing package ${packageId}...\n`);

  const { data, error } = await supabase
    .from('tours_packages')
    .update({ status: 'published' })
    .eq('id', packageId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data) {
    console.log('❌ Package not found.\n');
    return;
  }

  console.log(`✅ Package "${data.title}" is now published!\n`);
}

async function createTestPackage() {
  console.log('\n🎨 Creating test package...\n');

  // First, get an operator ID
  const { data: operators } = await supabase
    .from('tours_operators')
    .select('id, business_name')
    .eq('accreditation_status', 'approved')
    .limit(1);

  if (!operators || operators.length === 0) {
    console.log('❌ No approved operators found. Please create an operator first.\n');
    return;
  }

  const operator = operators[0];
  console.log(`Using operator: ${operator.business_name}\n`);

  // Create package
  const { data: pkg, error } = await supabase
    .from('tours_packages')
    .insert({
      operator_id: operator.id,
      title: 'Test Package - Island Hopping',
      description: 'Explore the beautiful islands of Daet with our expert guides. Visit pristine beaches, snorkel in crystal-clear waters, and enjoy a delicious lunch on a secluded island.',
      location_name: 'Daet, Camarines Norte',
      duration_value: 1,
      duration_type: 'days',
      status: 'published'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating package:', error.message);
    return;
  }

  console.log(`✅ Test package created: "${pkg.title}"`);
  console.log(`   ID: ${pkg.id}\n`);

  // Add inclusions
  const inclusions = [
    { item_text: 'Round-trip boat transfer', is_included: true },
    { item_text: 'Snorkeling equipment', is_included: true },
    { item_text: 'Lunch and refreshments', is_included: true },
    { item_text: 'Professional tour guide', is_included: true },
    { item_text: 'Personal expenses', is_included: false },
    { item_text: 'Travel insurance', is_included: false }
  ];

  const { error: inclError } = await supabase
    .from('tours_package_inclusions')
    .insert(
      inclusions.map(inc => ({ ...inc, package_id: pkg.id }))
    );

  if (inclError) {
    console.error('⚠️  Error adding inclusions:', inclError.message);
  } else {
    console.log(`✅ Added ${inclusions.length} inclusions\n`);
  }

  // Add price variant
  const { error: priceError } = await supabase
    .from('tours_package_price_variants')
    .insert({
      package_id: pkg.id,
      variant_name: 'Standard Rate',
      price_per_pax: 1500,
      min_pax: 2,
      max_pax: 10,
      is_default: true
    });

  if (priceError) {
    console.error('⚠️  Error adding price variant:', priceError.message);
  } else {
    console.log('✅ Added pricing\n');
  }

  console.log('🎉 Test package is ready! View it at:');
  console.log(`   http://localhost:3000/tours/packages/${pkg.id}\n`);
}

// Main
const command = process.argv[2];
const arg = process.argv[3];

(async () => {
  console.log('\n🛠️  DAET Tours - Admin Package Tools\n');

  switch (command) {
    case 'list':
      await listPackages();
      break;
    case 'approve':
      await approveAllPending();
      break;
    case 'publish':
      await publishPackage(arg);
      break;
    case 'create-test':
      await createTestPackage();
      break;
    default:
      console.log('Available commands:');
      console.log('  list         - List all packages');
      console.log('  approve      - Approve all pending packages');
      console.log('  publish <id> - Publish a specific package');
      console.log('  create-test  - Create a test package\n');
      console.log('Usage: node scripts/admin-package-tools.js <command>\n');
  }
})();
