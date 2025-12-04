/**
 * Simple script to fix user custom claims
 * Run this with: node fix-user-claims-simple.mjs <email>
 * 
 * Make sure you have GOOGLE_APPLICATION_CREDENTIALS set or run this from Firebase console
 */

import admin from 'firebase-admin';

// Initialize with default credentials
if (!admin.apps.length) {
  admin.initializeApp();
}

const email = process.argv[2];

if (!email) {
  console.error('Usage: node fix-user-claims-simple.mjs <email>');
  process.exit(1);
}

try {
  console.log(`\n🔍 Looking up user: ${email}`);
  
  const userRecord = await admin.auth().getUserByEmail(email);
  console.log(`✅ Found user: ${userRecord.uid}`);
  
  const currentClaims = userRecord.customClaims || {};
  console.log('\n📋 Current claims:', JSON.stringify(currentClaims, null, 2));
  
  const tenantId = currentClaims.tenantId || 
                   currentClaims.restaurantId || 
                   currentClaims.officeId || 
                   currentClaims.agentId;
  
  if (!tenantId) {
    console.error('❌ No tenant ID found in claims.');
    process.exit(1);
  }
  
  if (currentClaims.tenantId) {
    console.log('✅ User already has tenantId set.');
    process.exit(0);
  }
  
  const updatedClaims = {
    ...currentClaims,
    tenantId: tenantId,
  };
  
  console.log('\n📝 Updating to:', JSON.stringify(updatedClaims, null, 2));
  
  await admin.auth().setCustomUserClaims(userRecord.uid, updatedClaims);
  
  console.log('\n✅ Claims updated! User needs to log out and log back in.');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
