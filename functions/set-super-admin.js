// Set super admin claim for sroy@worksidesoftware.com
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setSuperAdmin() {
  const email = 'sroy@worksidesoftware.com';
  
  try {
    console.log(`Setting super admin role for: ${email}...`);
    
    // Get the user
    const user = await admin.auth().getUserByEmail(email);
    console.log(`✓ Found user with UID: ${user.uid}`);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'super_admin',
      type: 'merxus',
    });
    console.log(`✓ Custom claims set successfully`);
    
    // Verify the claims were set
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log(`✓ Verified custom claims:`, updatedUser.customClaims);
    
    console.log('\n✅ SUCCESS! Super admin role has been set.');
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('   1. Log out of the Merxus web app');
    console.log('   2. Log back in with sroy@worksidesoftware.com');
    console.log('   3. Look for "User Management" in the Merxus sidebar');
    console.log('\n   The auth token needs to be refreshed for the new role to take effect.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

setSuperAdmin();
