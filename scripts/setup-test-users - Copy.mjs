/**
 * Script to set up test users for development
 * 
 * Usage:
 *   node scripts/setup-test-users.mjs
 * 
 * This script uses Firebase Admin SDK to create test users with custom claims.
 * Make sure you have a service account key file or are authenticated with Firebase CLI.
 */

import admin from 'firebase-admin';
import readline from 'readline';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
// Option 1: Use service account key file (if available)
// Place serviceAccountKey.json in the scripts directory
let useServiceAccount = false;
const keyPath = join(__dirname, 'serviceAccountKey.json');

if (existsSync(keyPath)) {
  try {
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    useServiceAccount = true;
    console.log('✅ Using service account key for authentication\n');
  } catch (error) {
    console.warn('⚠️  Could not load service account key:', error.message);
    console.log('Falling back to Firebase CLI authentication...\n');
  }
}

// Option 2: Use application default credentials (requires gcloud auth, not just firebase login)
if (!useServiceAccount) {
  try {
    // Try to initialize with default credentials
    // This requires: gcloud auth application-default login
    admin.initializeApp();
    console.log('✅ Using application default credentials\n');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('AUTHENTICATION REQUIRED');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('The script needs a service account key file to work.\n');
    console.log('📋 QUICK FIX: Create a service account key file\n');
    console.log('1. Go to: https://console.firebase.google.com/');
    console.log('2. Select your project');
    console.log('3. Click ⚙️ (gear icon) → Project settings');
    console.log('4. Click "Service accounts" tab');
    console.log('5. Click "Generate new private key"');
    console.log('6. Click "Generate key" in the dialog');
    console.log('7. Rename the downloaded file to: serviceAccountKey.json');
    console.log('8. Move it to: web/scripts/serviceAccountKey.json\n');
    console.log('📖 For detailed instructions, see: SERVICE_ACCOUNT_SETUP.md\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function setupRestaurantUser() {
  console.log('\n=== Setting up Restaurant User ===');
  
  const email = await question('Email: ');
  const password = await question('Password: ');
  const role = await question('Role (owner/manager/staff): ');
  const restaurantId = await question('Restaurant ID: ');
  const displayName = await question('Display Name (optional): ');

  if (!['owner', 'manager', 'staff'].includes(role)) {
    console.error('Invalid role. Must be owner, manager, or staff.');
    return;
  }

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('User already exists, updating...');
    } catch {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || email.split('@')[0],
        emailVerified: false,
      });
      console.log('User created.');
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      restaurantId,
      type: 'restaurant',
    });

    // Create user document in Firestore
    await admin
      .firestore()
      .collection('restaurants')
      .doc(restaurantId)
      .collection('users')
      .doc(userRecord.uid)
      .set(
        {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || displayName || '',
          role,
          invitedAt: new Date().toISOString(),
          disabled: false,
        },
        { merge: true }
      );

    console.log(`✅ Successfully set up user: ${email}`);
    console.log(`   Role: ${role}`);
    console.log(`   Restaurant ID: ${restaurantId}`);
    console.log(`   UID: ${userRecord.uid}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function setupMerxusAdmin() {
  console.log('\n=== Setting up Merxus Admin ===');
  
  const email = await question('Email: ');
  const password = await question('Password: ');
  const role = await question('Role (merxus_admin/merxus_support): ');
  const displayName = await question('Display Name (optional): ');

  if (!['merxus_admin', 'merxus_support'].includes(role)) {
    console.error('Invalid role. Must be merxus_admin or merxus_support.');
    return;
  }

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('User already exists, updating...');
    } catch {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || email.split('@')[0],
        emailVerified: false,
      });
      console.log('User created.');
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      type: 'merxus',
    });

    console.log(`✅ Successfully set up Merxus ${role}: ${email}`);
    console.log(`   Role: ${role}`);
    console.log(`   UID: ${userRecord.uid}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function main() {
  console.log('Merxus Test User Setup Script\n');
  console.log('This script will help you create test users with proper custom claims.\n');

  while (true) {
    const choice = await question(
      'Choose an option:\n' +
      '1. Create Restaurant User\n' +
      '2. Create Merxus Admin\n' +
      '3. Exit\n' +
      'Choice: '
    );

    if (choice === '1') {
      await setupRestaurantUser();
    } else if (choice === '2') {
      await setupMerxusAdmin();
    } else if (choice === '3') {
      break;
    } else {
      console.log('Invalid choice.');
    }
  }

  rl.close();
  process.exit(0);
}

main().catch(console.error);

