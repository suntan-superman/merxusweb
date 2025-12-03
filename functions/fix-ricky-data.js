/**
 * Script to move Ricky's data from voiceOffices/settings/general to offices/meta/settings
 * Run with: node fix-ricky-data.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixRickyData() {
  console.log('🔧 Starting data migration for Ricky...\n');

  const email = 'ricky@merxusllc.com';
  const officeId = 'office_1764791765943_1vnv5wxc7';

  try {
    // 1. Read data from OLD locations
    console.log('📖 Reading data from OLD locations...');
    
    // Read from voiceOffices
    const oldOfficeDoc = await db.collection('voiceOffices').doc(officeId).get();
    const oldOfficeData = oldOfficeDoc.data();
    console.log('  ✓ Read from voiceOffices:', oldOfficeData);

    // Read from settings/general
    const oldSettingsDoc = await db.collection('voiceOffices').doc(officeId).collection('settings').doc('general').get();
    const oldSettingsData = oldSettingsDoc.data();
    console.log('  ✓ Read from settings/general:', oldSettingsData);

    // Read users
    const oldUsersSnapshot = await db.collection('voiceOffices').doc(officeId).collection('users').get();
    const oldUsers = [];
    oldUsersSnapshot.forEach(doc => oldUsers.push({ id: doc.id, ...doc.data() }));
    console.log(`  ✓ Found ${oldUsers.length} user(s)`);

    // 2. Write to NEW locations
    console.log('\n📝 Writing data to NEW locations...');
    
    // Write to offices
    await db.collection('offices').doc(officeId).set({
      email: oldOfficeData.email,
      createdAt: oldOfficeData.createdAt,
      disabled: oldOfficeData.disabled || false,
    });
    console.log('  ✓ Created offices/' + officeId);

    // Write to meta/settings
    await db.collection('offices').doc(officeId).collection('meta').doc('settings').set({
      officeId: oldSettingsData.officeId,
      name: oldSettingsData.name,
      email: oldSettingsData.email || oldSettingsData.mail, // Handle typo
      phoneNumber: oldSettingsData.phoneNumber,
      twilioPhoneNumber: oldOfficeData.phoneNumber || oldSettingsData.phoneNumber,
      twilioNumberSid: oldSettingsData.twilioNumberSid || oldOfficeData.twilioNumberSid,
      address: '',
      websiteUrl: '',
      timezone: oldSettingsData.timezone || 'America/Los_Angeles',
      businessType: {
        category: '',
        industry: '',
      },
      businessHours: {
        monday: { open: '09:00', close: '17:00', closed: false },
        tuesday: { open: '09:00', close: '17:00', closed: false },
        wednesday: { open: '09:00', close: '17:00', closed: false },
        thursday: { open: '09:00', close: '17:00', closed: false },
        friday: { open: '09:00', close: '17:00', closed: false },
        saturday: { open: '09:00', close: '17:00', closed: true },
        sunday: { open: '09:00', close: '17:00', closed: true },
      },
      services: [],
      products: [],
      notifySmsNumbers: [],
      notifyEmailAddresses: [email],
      aiConfig: {
        model: 'gpt-4o-mini',
        voiceName: 'alloy',
        language: 'en-US',
        systemPrompt: '',
      },
    });
    console.log('  ✓ Created offices/' + officeId + '/meta/settings');

    // Write users
    for (const user of oldUsers) {
      await db.collection('offices').doc(officeId).collection('users').doc(user.id).set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        invitedAt: user.invitedAt,
        disabled: user.disabled || false,
      });
      console.log(`  ✓ Created user: ${user.email}`);
    }

    console.log('\n✅ SUCCESS! Data migration complete!');
    console.log('\n📋 Summary:');
    console.log(`  • Moved office data to: offices/${officeId}`);
    console.log(`  • Moved settings to: offices/${officeId}/meta/settings`);
    console.log(`  • Moved ${oldUsers.length} user(s)`);
    console.log('\n⚠️  Note: OLD data in voiceOffices is still there (not deleted for safety)');
    console.log('   You can manually delete it from Firebase Console if needed.\n');

  } catch (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  }

  process.exit(0);
}

fixRickyData();
