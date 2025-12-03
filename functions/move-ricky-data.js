/**
 * Move Ricky's data from voiceOffices to offices
 * Run: node move-ricky-data.js
 */

const admin = require('firebase-admin');

// Initialize
try {
  admin.app();
} catch (e) {
  admin.initializeApp();
}

const db = admin.firestore();
const officeId = 'office_1764793443409_938sxj8l0';

async function moveData() {
  console.log('Moving data from voiceOffices to offices...\n');

  try {
    // 1. Read from voiceOffices
    const oldOfficeDoc = await db.collection('voiceOffices').doc(officeId).get();
    if (!oldOfficeDoc.exists) {
      console.log('❌ No data found in voiceOffices/' + officeId);
      process.exit(1);
    }

    const oldOfficeData = oldOfficeDoc.data();
    console.log('✓ Read from voiceOffices/' + officeId);

    // Check for settings in old locations
    let oldSettingsData = null;
    
    // Try meta/settings first
    let oldSettingsDoc = await db.collection('voiceOffices').doc(officeId).collection('meta').doc('settings').get();
    if (oldSettingsDoc.exists) {
      oldSettingsData = oldSettingsDoc.data();
      console.log('✓ Read from voiceOffices/.../meta/settings');
    } else {
      // Try settings/general
      oldSettingsDoc = await db.collection('voiceOffices').doc(officeId).collection('settings').doc('general').get();
      if (oldSettingsDoc.exists) {
        oldSettingsData = oldSettingsDoc.data();
        console.log('✓ Read from voiceOffices/.../settings/general');
      }
    }

    // Get users
    const oldUsersSnapshot = await db.collection('voiceOffices').doc(officeId).collection('users').get();
    console.log(`✓ Found ${oldUsersSnapshot.size} user(s)\n`);

    // 2. Write to correct location
    await db.collection('offices').doc(officeId).set({
      email: oldOfficeData.email,
      createdAt: oldOfficeData.createdAt,
      disabled: false,
    });
    console.log('✓ Created offices/' + officeId);

    // Write settings
    if (oldSettingsData) {
      await db.collection('offices').doc(officeId).collection('meta').doc('settings').set({
        officeId: officeId,
        name: oldSettingsData.name || oldOfficeData.name || 'Aguirre Construction Services',
        email: oldSettingsData.email || oldSettingsData.mail || oldOfficeData.email,
        phoneNumber: oldSettingsData.phoneNumber || oldOfficeData.phoneNumber || '',
        twilioPhoneNumber: oldSettingsData.phoneNumber || oldOfficeData.phoneNumber || '',
        twilioNumberSid: oldSettingsData.twilioNumberSid || oldOfficeData.twilioNumberSid || '',
        address: oldSettingsData.address || '',
        websiteUrl: oldSettingsData.websiteUrl || '',
        timezone: oldSettingsData.timezone || 'America/Los_Angeles',
        businessType: oldSettingsData.businessType || { category: '', industry: '' },
        businessHours: oldSettingsData.businessHours || {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: true },
          sunday: { open: '09:00', close: '17:00', closed: true },
        },
        services: oldSettingsData.services || [],
        products: oldSettingsData.products || [],
        notifySmsNumbers: oldSettingsData.notifySmsNumbers || [],
        notifyEmailAddresses: oldSettingsData.notifyEmailAddresses || [oldOfficeData.email],
        aiConfig: oldSettingsData.aiConfig || {
          model: 'gpt-4o-mini',
          voiceName: 'alloy',
          language: 'en-US',
          systemPrompt: '',
        },
      });
      console.log('✓ Created offices/' + officeId + '/meta/settings');
    }

    // Copy users
    for (const doc of oldUsersSnapshot.docs) {
      await db.collection('offices').doc(officeId).collection('users').doc(doc.id).set(doc.data());
      console.log('✓ Copied user:', doc.data().email);
    }

    console.log('\n✅ SUCCESS! Data moved to offices collection');
    console.log('   Ricky should now see his data when he refreshes!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }

  process.exit(0);
}

moveData();
