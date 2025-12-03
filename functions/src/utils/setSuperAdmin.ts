import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

async function setSuperAdminClaim(email: string) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'super_admin',
      type: 'merxus',
    });

    console.log(`✅ Super admin role set for: ${email}`);
    console.log(`   UID: ${user.uid}`);
    console.log('   Please have the user log out and log back in for the changes to take effect.');
    
    // Verify
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('   Custom claims:', updatedUser.customClaims);
  } catch (error: any) {
    console.error('Error setting super admin claim:', error.message);
  }
}

// Set super admin for sroy@worksidesoftware.com
setSuperAdminClaim('sroy@worksidesoftware.com')
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
