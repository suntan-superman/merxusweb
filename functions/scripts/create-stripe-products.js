/**
 * Setup Stripe Products - Automatic Version
 * Reads Stripe key from Firebase config automatically
 * 
 * Usage: 
 * 1. First: firebase functions:config:get > .runtimeconfig.json
 * 2. Then: node scripts/create-stripe-products.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🚀 Merxus Stripe Products Setup\n');
console.log('═══════════════════════════════════════════════════\n');

// Try to read Stripe key from Firebase config
let stripeKey;

try {
  const configPath = path.join(__dirname, '../.runtimeconfig.json');
  console.log('📄 Reading Firebase config from:', configPath);
  
  // PowerShell creates files as UTF-16LE, so try that first
  let fileContent;
  try {
    fileContent = fs.readFileSync(configPath, 'utf16le');
  } catch (error) {
    fileContent = fs.readFileSync(configPath, 'utf8');
  }
  
  // Remove BOM (Byte Order Mark) if present
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.substring(1);
  }
  
  const runtimeConfig = JSON.parse(fileContent);
  stripeKey = runtimeConfig.stripe?.secret_key;
  
  if (stripeKey) {
    console.log('✅ Found Stripe secret key in Firebase config');
    console.log(`   Key starts with: ${stripeKey.substring(0, 10)}...\n`);
  }
} catch (error) {
  console.log('⚠️  Could not read .runtimeconfig.json');
  console.log('   Error:', error.message, '\n');
}

if (!stripeKey) {
  console.error('❌ ERROR: Stripe secret key not found!');
  console.error('\nPlease run this command first:');
  console.error('  firebase functions:config:get > .runtimeconfig.json\n');
  process.exit(1);
}

// Now load Stripe
const stripe = require('stripe')(stripeKey);

const PRODUCTS_CONFIG = {
  restaurant: {
    basic: {
      name: 'Merxus Restaurant - Basic',
      description: 'AI Phone Assistant for Restaurants - Basic Plan with order and reservation taking',
      monthly: 19900, // $199.00
      setup: 29900,   // $299.00
    },
    enterprise: {
      name: 'Merxus Restaurant - Enterprise',
      description: 'AI Phone Assistant for Restaurants - Enterprise Plan with POS integration (Toast/Square)',
      monthly: 49900, // $499.00
      setup: 99900,   // $999.00
    },
  },
  voice: {
    basic: {
      name: 'Merxus Voice - Basic',
      description: 'AI Phone Assistant for Small Business - Basic Plan',
      monthly: 4900,  // $49.00
      setup: 4900,    // $49.00
    },
    professional: {
      name: 'Merxus Voice - Professional',
      description: 'AI Phone Assistant for Small Business - Professional Plan with call routing',
      monthly: 9900,  // $99.00
      setup: 14900,   // $149.00
    },
    enterprise: {
      name: 'Merxus Voice - Enterprise',
      description: 'AI Phone Assistant for Small Business - Enterprise Plan with API access',
      monthly: 19900, // $199.00
      setup: 24900,   // $249.00
    },
  },
  real_estate: {
    basic: {
      name: 'Merxus Real Estate - Basic',
      description: 'AI Phone Assistant for Real Estate Agents - Basic Plan',
      monthly: 4900,  // $49.00
      setup: 4900,    // $49.00
    },
    professional: {
      name: 'Merxus Real Estate - Professional',
      description: 'AI Phone Assistant for Real Estate Agents - Professional Plan with scheduling',
      monthly: 7900,  // $79.00
      setup: 9900,    // $99.00
    },
  },
};

async function createProduct(config) {
  try {
    console.log(`📦 Creating product: ${config.name}...`);
    
    // Create product
    const product = await stripe.products.create({
      name: config.name,
      description: config.description,
      metadata: {
        created_by: 'merxus-setup-script',
        created_at: new Date().toISOString(),
      },
    });
    
    console.log(`   ✅ Product created: ${product.id}`);
    
    // Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: config.monthly,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        type: 'monthly',
      },
    });
    
    console.log(`   ✅ Monthly price: ${monthlyPrice.id} ($${(config.monthly / 100).toFixed(2)}/month)`);
    
    // Create setup fee price
    const setupPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: config.setup,
      currency: 'usd',
      metadata: {
        type: 'setup',
      },
    });
    
    console.log(`   ✅ Setup price: ${setupPrice.id} ($${(config.setup / 100).toFixed(2)} one-time)\n`);
    
    return {
      productId: product.id,
      monthlyPriceId: monthlyPrice.id,
      setupPriceId: setupPrice.id,
    };
  } catch (error) {
    console.error(`❌ Error creating product ${config.name}:`, error.message);
    throw error;
  }
}

async function setupAllProducts() {
  const results = {
    restaurant: {},
    voice: {},
    real_estate: {},
  };
  
  try {
    // Create Restaurant products
    console.log('🍽️  RESTAURANT PRODUCTS\n');
    results.restaurant.basic = await createProduct(PRODUCTS_CONFIG.restaurant.basic);
    results.restaurant.enterprise = await createProduct(PRODUCTS_CONFIG.restaurant.enterprise);
    
    // Create Voice products
    console.log('📞 VOICE PRODUCTS\n');
    results.voice.basic = await createProduct(PRODUCTS_CONFIG.voice.basic);
    results.voice.professional = await createProduct(PRODUCTS_CONFIG.voice.professional);
    results.voice.enterprise = await createProduct(PRODUCTS_CONFIG.voice.enterprise);
    
    // Create Real Estate products
    console.log('🏡 REAL ESTATE PRODUCTS\n');
    results.real_estate.basic = await createProduct(PRODUCTS_CONFIG.real_estate.basic);
    results.real_estate.professional = await createProduct(PRODUCTS_CONFIG.real_estate.professional);
    
    // Print summary
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ ALL PRODUCTS CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════\n');
    
    // Save to file
    const outputPath = path.join(__dirname, 'stripe-prices.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`💾 Price IDs saved to: ${outputPath}\n`);
    
    // Print code to copy
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 COPY THIS CODE AND SEND IT TO ME:');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('const STRIPE_PRICES = {');
    console.log('  restaurant: {');
    console.log(`    basic: { monthly: '${results.restaurant.basic.monthlyPriceId}', setup: '${results.restaurant.basic.setupPriceId}' },`);
    console.log(`    enterprise: { monthly: '${results.restaurant.enterprise.monthlyPriceId}', setup: '${results.restaurant.enterprise.setupPriceId}' },`);
    console.log('  },');
    console.log('  voice: {');
    console.log(`    basic: { monthly: '${results.voice.basic.monthlyPriceId}', setup: '${results.voice.basic.setupPriceId}' },`);
    console.log(`    professional: { monthly: '${results.voice.professional.monthlyPriceId}', setup: '${results.voice.professional.setupPriceId}' },`);
    console.log(`    enterprise: { monthly: '${results.voice.enterprise.monthlyPriceId}', setup: '${results.voice.enterprise.setupPriceId}' },`);
    console.log('  },');
    console.log('  real_estate: {');
    console.log(`    basic: { monthly: '${results.real_estate.basic.monthlyPriceId}', setup: '${results.real_estate.basic.setupPriceId}' },`);
    console.log(`    professional: { monthly: '${results.real_estate.professional.monthlyPriceId}', setup: '${results.real_estate.professional.setupPriceId}' },`);
    console.log('  },');
    console.log('};\n');
    
    console.log('═══════════════════════════════════════════════════\n');
    console.log('🎉 Done! Copy the code above and send it to me!\n');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupAllProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
