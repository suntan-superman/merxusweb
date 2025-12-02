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

async function getRestaurants() {
  try {
    const restaurants = [];
    const snapshot = await admin.firestore().collection('restaurants').get();
    
    for (const doc of snapshot.docs) {
      const settingsDoc = await doc.ref.collection('meta').doc('settings').get();
      const settings = settingsDoc.data() || {};
      restaurants.push({
        id: doc.id,
        name: settings.name || 'Unnamed Restaurant',
        email: settings.email || '',
        phoneNumber: settings.phoneNumber || '',
      });
    }
    
    return restaurants.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching restaurants:', error.message);
    return [];
  }
}

async function getOffices() {
  try {
    const offices = [];
    const snapshot = await admin.firestore().collection('offices').get();
    
    for (const doc of snapshot.docs) {
      const settingsDoc = await doc.ref.collection('meta').doc('settings').get();
      const settings = settingsDoc.data() || {};
      offices.push({
        id: doc.id,
        name: settings.name || 'Unnamed Office',
        email: settings.email || '',
        phoneNumber: settings.phoneNumber || '',
      });
    }
    
    return offices.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching offices:', error.message);
    return [];
  }
}

async function setupRestaurantUser() {
  console.log('\n=== Setting up Restaurant User ===');
  
  // Get email
  const email = await question('Email: ');
  if (!email || !email.includes('@')) {
    console.error('❌ Invalid email address');
    return;
  }

  // Get password
  const password = await question('Password: ');
  if (!password || password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    return;
  }

  // Get display name
  const displayName = await question('Display Name (optional, press Enter to skip): ');

  // Get role with numbered selection
  console.log('\nSelect Role:');
  console.log('1. Owner');
  console.log('2. Manager');
  console.log('3. Staff');
  const roleChoice = await question('Choice (1-3): ');
  
  const roleMap = {
    '1': 'owner',
    '2': 'manager',
    '3': 'staff',
  };
  
  const role = roleMap[roleChoice];
  if (!role) {
    console.error('❌ Invalid role choice. Must be 1, 2, or 3.');
    return;
  }

  // Get restaurant with numbered selection
  console.log('\nFetching restaurants...');
  const restaurants = await getRestaurants();
  
  if (restaurants.length === 0) {
    console.error('❌ No restaurants found in database.');
    console.log('   You can still enter a restaurant ID manually if needed.');
    const restaurantId = await question('Restaurant ID (or press Enter to cancel): ');
    if (!restaurantId) {
      console.log('Cancelled.');
      return;
    }
    await createUserWithRestaurant(email, password, role, restaurantId, displayName);
    return;
  }

  console.log('\nAvailable Restaurants:');
  restaurants.forEach((r, index) => {
    console.log(`${index + 1}. ${r.name} (ID: ${r.id})`);
    if (r.phoneNumber) {
      console.log(`   Phone: ${r.phoneNumber}`);
    }
  });
  console.log(`${restaurants.length + 1}. Enter Restaurant ID manually`);
  
  const restaurantChoice = await question(`\nSelect Restaurant (1-${restaurants.length + 1}): `);
  const choiceNum = parseInt(restaurantChoice, 10);
  
  let restaurantId;
  if (choiceNum >= 1 && choiceNum <= restaurants.length) {
    restaurantId = restaurants[choiceNum - 1].id;
    console.log(`✅ Selected: ${restaurants[choiceNum - 1].name}`);
  } else if (choiceNum === restaurants.length + 1) {
    restaurantId = await question('Enter Restaurant ID: ');
    if (!restaurantId) {
      console.log('Cancelled.');
      return;
    }
  } else {
    console.error('❌ Invalid selection.');
    return;
  }

  await createUserWithRestaurant(email, password, role, restaurantId, displayName);
}

async function createUserWithRestaurant(email, password, role, restaurantId, displayName) {

  try {
    // Verify restaurant exists
    const restaurantDoc = await admin.firestore().collection('restaurants').doc(restaurantId).get();
    if (!restaurantDoc.exists) {
      console.error(`❌ Restaurant with ID "${restaurantId}" not found.`);
      return;
    }

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('ℹ️  User already exists, updating claims and Firestore document...');
    } catch {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || email.split('@')[0],
        emailVerified: false,
      });
      console.log('✅ User created in Firebase Auth.');
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      restaurantId,
      type: 'restaurant',
    });
    console.log('✅ Custom claims set.');

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
          invitedAt: admin.firestore.FieldValue.serverTimestamp(),
          disabled: false,
        },
        { merge: true }
      );
    console.log('✅ Firestore user document created/updated.');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! User setup complete');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);
    console.log(`Restaurant ID: ${restaurantId}`);
    console.log(`UID: ${userRecord.uid}`);
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  }
}

async function setupSuperAdmin() {
  console.log('\n=== Setting up Super Admin ===');
  
  const email = await question('Email: ');
  if (!email || !email.includes('@')) {
    console.error('❌ Invalid email address');
    return;
  }

  const password = await question('Password: ');
  if (!password || password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    return;
  }

  const displayName = await question('Display Name (optional, press Enter to skip): ');

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('ℹ️  User already exists, updating claims...');
    } catch {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || email.split('@')[0],
        emailVerified: false,
      });
      console.log('✅ User created in Firebase Auth.');
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'super_admin',
      type: 'merxus',
    });
    console.log('✅ Custom claims set.');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Super Admin setup complete');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Email: ${email}`);
    console.log(`Role: super_admin`);
    console.log(`Type: merxus`);
    console.log(`UID: ${userRecord.uid}`);
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  }
}

async function setupMerxusAdmin() {
  console.log('\n=== Setting up Merxus Admin ===');
  
  const email = await question('Email: ');
  if (!email || !email.includes('@')) {
    console.error('❌ Invalid email address');
    return;
  }

  const password = await question('Password: ');
  if (!password || password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    return;
  }

  const displayName = await question('Display Name (optional, press Enter to skip): ');

  // Get role with numbered selection
  console.log('\nSelect Role:');
  console.log('1. Merxus Admin (full access)');
  console.log('2. Merxus Support (limited access)');
  const roleChoice = await question('Choice (1-2): ');
  
  const roleMap = {
    '1': 'merxus_admin',
    '2': 'merxus_support',
  };
  
  const role = roleMap[roleChoice];
  if (!role) {
    console.error('❌ Invalid role choice. Must be 1 or 2.');
    return;
  }

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('ℹ️  User already exists, updating claims...');
    } catch {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || email.split('@')[0],
        emailVerified: false,
      });
      console.log('✅ User created in Firebase Auth.');
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      type: 'merxus',
    });
    console.log('✅ Custom claims set.');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Merxus Admin setup complete');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);
    console.log(`UID: ${userRecord.uid}`);
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  }
}

async function setupVoiceUser() {
  console.log('\n=== Setting up Voice Portal Company Admin ===');
  
  // Get email
  const email = await question('Email: ');
  if (!email || !email.includes('@')) {
    console.error('❌ Invalid email address');
    return;
  }

  // Get password
  const password = await question('Password: ');
  if (!password || password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    return;
  }

  // Get display name
  const displayName = await question('Display Name (optional, press Enter to skip): ');

  // Get role with numbered selection
  console.log('\nSelect Role:');
  console.log('1. Owner (Company Admin - full access)');
  console.log('2. Manager');
  console.log('3. Staff');
  const roleChoice = await question('Choice (1-3): ');
  
  const roleMap = {
    '1': 'owner',
    '2': 'manager',
    '3': 'staff',
  };
  
  const role = roleMap[roleChoice];
  if (!role) {
    console.error('❌ Invalid role choice. Must be 1, 2, or 3.');
    return;
  }

  // Get office with numbered selection
  console.log('\nFetching offices...');
  const offices = await getOffices();
  
  if (offices.length === 0) {
    console.error('❌ No offices found in database.');
    console.log('   You can still enter an office ID manually if needed.');
    const officeId = await question('Office ID (or press Enter to cancel): ');
    if (!officeId) {
      console.log('Cancelled.');
      return;
    }
    await createUserWithOffice(email, password, role, officeId, displayName);
    return;
  }

  console.log('\nAvailable Offices:');
  offices.forEach((o, index) => {
    console.log(`${index + 1}. ${o.name} (ID: ${o.id})`);
    if (o.phoneNumber) {
      console.log(`   Phone: ${o.phoneNumber}`);
    }
  });
  console.log(`${offices.length + 1}. Enter Office ID manually`);
  
  const officeChoice = await question(`\nSelect Office (1-${offices.length + 1}): `);
  const choiceNum = parseInt(officeChoice, 10);
  
  let officeId;
  if (choiceNum >= 1 && choiceNum <= offices.length) {
    officeId = offices[choiceNum - 1].id;
    console.log(`✅ Selected: ${offices[choiceNum - 1].name}`);
  } else if (choiceNum === offices.length + 1) {
    officeId = await question('Enter Office ID: ');
    if (!officeId) {
      console.log('Cancelled.');
      return;
    }
  } else {
    console.error('❌ Invalid selection.');
    return;
  }

  await createUserWithOffice(email, password, role, officeId, displayName);
}

async function createUserWithOffice(email, password, role, officeId, displayName) {
  try {
    // Verify office exists
    const officeDoc = await admin.firestore().collection('offices').doc(officeId).get();
    if (!officeDoc.exists) {
      console.error(`❌ Office with ID "${officeId}" not found.`);
      return;
    }

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('ℹ️  User already exists, updating claims and Firestore document...');
    } catch {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || email.split('@')[0],
        emailVerified: false,
      });
      console.log('✅ User created in Firebase Auth.');
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      officeId,
      type: 'voice',
    });
    console.log('✅ Custom claims set.');

    // Create user document in Firestore
    await admin
      .firestore()
      .collection('offices')
      .doc(officeId)
      .collection('users')
      .doc(userRecord.uid)
      .set(
        {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || displayName || '',
          role,
          invitedAt: admin.firestore.FieldValue.serverTimestamp(),
          disabled: false,
        },
        { merge: true }
      );
    console.log('✅ Firestore user document created/updated.');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! User setup complete');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);
    console.log(`Office ID: ${officeId}`);
    console.log(`UID: ${userRecord.uid}`);
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  }
}

async function main() {
  console.log('Merxus Test User Setup Script\n');
  console.log('This script will help you create test users with proper custom claims.\n');

  while (true) {
    const choice = await question(
      'Choose an option:\n' +
      '1. Create Restaurant User\n' +
      '2. Create Voice Portal Company Admin\n' +
      '3. Create Super Admin\n' +
      '4. Create Merxus Admin\n' +
      '5. Exit\n' +
      'Choice: '
    );

    if (choice === '1') {
      await setupRestaurantUser();
    } else if (choice === '2') {
      await setupVoiceUser();
    } else if (choice === '3') {
      await setupSuperAdmin();
    } else if (choice === '4') {
      await setupMerxusAdmin();
    } else if (choice === '5') {
      break;
    } else {
      console.log('Invalid choice.');
    }
  }

  rl.close();
  process.exit(0);
}

main().catch(console.error);

