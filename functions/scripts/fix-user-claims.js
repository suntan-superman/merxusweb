/**
 * Script to fix user custom claims
 * This script updates user claims to include the tenantId field
 * 
 * Usage:
 * node fix-user-claims.js <email>
 * 
 * Example:
 * node fix-user-claims.js user@example.com
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function fixUserClaims(email) {
  try {
    console.log(`\n🔍 Looking up user: ${email}`);
    
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`✅ Found user: ${userRecord.uid}`);
    
    // Get current custom claims
    const currentClaims = userRecord.customClaims || {};
    console.log('\n📋 Current claims:', JSON.stringify(currentClaims, null, 2));
    
    // Compute the tenantId from existing claims
    const tenantId = currentClaims.tenantId || 
                     currentClaims.restaurantId || 
                     currentClaims.officeId || 
                     currentClaims.agentId;
    
    if (!tenantId) {
      console.error('❌ No tenant ID found in claims. Cannot fix.');
      process.exit(1);
    }
    
    if (currentClaims.tenantId) {
      console.log('✅ User already has tenantId set. No fix needed.');
      process.exit(0);
    }
    
    // Build updated claims
    const updatedClaims = {
      ...currentClaims,
      tenantId: tenantId,
    };
    
    console.log('\n📝 Updated claims:', JSON.stringify(updatedClaims, null, 2));
    
    // Ask for confirmation
    console.log('\n⚠️  Ready to update claims. Press Ctrl+C to cancel, or wait 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Update claims
    await admin.auth().setCustomUserClaims(userRecord.uid, updatedClaims);
    
    console.log('\n✅ Claims updated successfully!');
    console.log('\n🔄 The user needs to log out and log back in for the changes to take effect.');
    console.log('   Or they can refresh their token by calling the refresh endpoint.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('Usage: node fix-user-claims.js <email>');
  process.exit(1);
}

fixUserClaims(email);
