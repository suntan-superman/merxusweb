/**
 * Quick script to upgrade sroy@worksidesoftware.com to super_admin
 * 
 * Usage:
 *   node scripts/upgrade-to-super-admin.mjs
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const keyPath = join(__dirname, 'serviceAccountKey.json');

if (existsSync(keyPath)) {
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Using service account key for authentication\n');
} else {
  admin.initializeApp();
  console.log('✅ Using application default credentials\n');
}

async function upgradeSuperAdmin() {
  const email = 'sroy@worksidesoftware.com';
  
  try {
    console.log(`Upgrading ${email} to super_admin...\n`);
    
    // Get the user
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`✅ Found user with UID: ${userRecord.uid}`);
    
    // Get current claims
    const currentClaims = userRecord.customClaims || {};
    console.log(`Current claims:`, currentClaims);
    
    // Set super admin claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'super_admin',
      type: 'merxus',
    });
    console.log('✅ Custom claims updated to super_admin');
    
    // Verify
    const updatedUser = await admin.auth().getUser(userRecord.uid);
    console.log('✅ Verified new claims:', updatedUser.customClaims);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Super Admin upgrade complete');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Email: ${email}`);
    console.log(`Old Role: ${currentClaims.role || 'none'}`);
    console.log(`New Role: super_admin`);
    console.log(`Type: merxus`);
    console.log(`UID: ${userRecord.uid}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n⚠️  IMPORTANT: Log out and log back in to refresh your token!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    process.exit(1);
  }
}

upgradeSuperAdmin();
