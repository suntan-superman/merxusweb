/**
 * Check Ricky's Firebase Auth claims
 */

const admin = require('firebase-admin');

// Try to use existing app or initialize
try {
  admin.app();
} catch (e) {
  admin.initializeApp();
}

async function checkClaims() {
  try {
    const email = 'ricky@merxusllc.com';
    
    console.log(`🔍 Checking Firebase Auth claims for ${email}...\n`);
    
    const userRecord = await admin.auth().getUserByEmail(email);
    
    console.log('✅ User found:');
    console.log('  UID:', userRecord.uid);
    console.log('  Email:', userRecord.email);
    console.log('  Display Name:', userRecord.displayName);
    console.log('  Disabled:', userRecord.disabled);
    console.log('\n📋 Custom Claims:', userRecord.customClaims || 'NONE');
    
    if (!userRecord.customClaims || !userRecord.customClaims.officeId) {
      console.log('\n❌ PROBLEM: User has NO officeId claim!');
      console.log('   The Voice settings page requires an officeId claim to work.');
      console.log('\n🔧 Setting officeId claim...');
      
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'owner',
        type: 'voice',
        officeId: 'office_1764791765943_1vnv5wxc7'
      });
      
      console.log('✅ Claims updated! User needs to log out and log back in.');
    } else {
      console.log('\n✅ User has correct claims!');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
  
  process.exit(0);
}

checkClaims();
