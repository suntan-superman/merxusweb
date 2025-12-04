/**
 * Setup Stripe Products - Manual Version
 * This version prompts for your Stripe secret key
 * 
 * Usage: node scripts/setup-stripe-manual.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🚀 Merxus Stripe Products Setup\n');
console.log('This script will create all products and prices in your Stripe account.\n');

rl.question('Enter your Stripe Secret Key (starts with sk_test_ or sk_live_): ', async (stripeKey) => {
  rl.close();
  
  if (!stripeKey || !stripeKey.startsWith('sk_')) {
    console.error('❌ Invalid Stripe key. Must start with sk_test_ or sk_live_');
    process.exit(1);
  }

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
      console.log(`\n📦 Creating product: ${config.name}...`);
      
      // Create product
      const product = await stripe.products.create({
        name: config.name,
        description: config.description,
        metadata: {
          created_by: 'merxus-setup-script',
        },
      });
      
      console.log(`✅ Product created: ${product.id}`);
      
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
      
      console.log(`✅ Monthly price created: ${monthlyPrice.id} ($${(config.monthly / 100).toFixed(2)}/month)`);
      
      // Create setup fee price
      const setupPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: config.setup,
        currency: 'usd',
        metadata: {
          type: 'setup',
        },
      });
      
      console.log(`✅ Setup price created: ${setupPrice.id} ($${(config.setup / 100).toFixed(2)} one-time)`);
      
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
    console.log('\n═══════════════════════════════════════════════════\n');
    
    const results = {
      restaurant: {},
      voice: {},
      real_estate: {},
    };
    
    try {
      // Create Restaurant products
      console.log('🍽️  RESTAURANT PRODUCTS');
      results.restaurant.basic = await createProduct(PRODUCTS_CONFIG.restaurant.basic);
      results.restaurant.enterprise = await createProduct(PRODUCTS_CONFIG.restaurant.enterprise);
      
      // Create Voice products
      console.log('\n\n📞 VOICE PRODUCTS');
      results.voice.basic = await createProduct(PRODUCTS_CONFIG.voice.basic);
      results.voice.professional = await createProduct(PRODUCTS_CONFIG.voice.professional);
      results.voice.enterprise = await createProduct(PRODUCTS_CONFIG.voice.enterprise);
      
      // Create Real Estate products
      console.log('\n\n🏡 REAL ESTATE PRODUCTS');
      results.real_estate.basic = await createProduct(PRODUCTS_CONFIG.real_estate.basic);
      results.real_estate.professional = await createProduct(PRODUCTS_CONFIG.real_estate.professional);
      
      // Print summary
      console.log('\n\n═══════════════════════════════════════════════════');
      console.log('✅ ALL PRODUCTS CREATED SUCCESSFULLY!');
      console.log('═══════════════════════════════════════════════════\n');
      
      // Save to file
      const fs = require('fs');
      const configPath = __dirname + '/stripe-prices.json';
      fs.writeFileSync(configPath, JSON.stringify(results, null, 2));
      console.log(`💾 Price IDs saved to: ${configPath}\n`);
      
      console.log('📋 IMPORTANT: Copy these lines to update billing.ts:\n');
      console.log('Replace the STRIPE_PRICES object in web/functions/src/routes/billing.ts with:\n');
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
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  // Run the setup
  await setupAllProducts();
  console.log('🎉 Setup complete! Deploy your functions to start accepting payments.');
  process.exit(0);
});
