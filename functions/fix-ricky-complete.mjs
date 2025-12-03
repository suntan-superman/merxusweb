/**
 * Complete fix for Ricky's account
 * Run with: node fix-ricky-complete.mjs
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const email = 'ricky@merxusllc.com';
const officeId = 'office_1764791765943_1vnv5wxc7';

async function fixRicky() {
  console.log('🔧 Fixing Ricky\'s account...\n');

  try {
    // 1. Get user
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log('✅ Found user:', userRecord.uid);
    console.log('   Current claims:', userRecord.customClaims);

    // 2. Set correct claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'owner',
      type: 'voice',
      officeId: officeId
    });
    console.log('✅ Set claims: { role: owner, type: voice, officeId:', officeId, '}');

    // 3. Read old data
    const oldOffice = await db.collection('voiceOffices').doc(officeId).get();
    const oldSettings = await db.collection('voiceOffices').doc(officeId).collection('settings').doc('general').get();
    const oldData = oldOffice.data();
    const oldSettingsData = oldSettings.data();
    
    console.log('✅ Read old data from voiceOffices');

    // 4. Write to correct location
    await db.collection('offices').doc(officeId).set({
      email: oldData.email,
      createdAt: oldData.createdAt,
      disabled: false
    });
    console.log('✅ Created offices/' + officeId);

    await db.collection('offices').doc(officeId).collection('meta').doc('settings').set({
      officeId: officeId,
      name: oldSettingsData.name || oldData.name,
      email: oldSettingsData.email || oldSettingsData.mail || oldData.email,
      phoneNumber: oldSettingsData.phoneNumber || oldData.phoneNumber,
      twilioPhoneNumber: oldSettingsData.phoneNumber || oldData.phoneNumber,
      twilioNumberSid: oldSettingsData.twilioNumberSid || oldData.twilioNumberSid,
      address: '',
      websiteUrl: '',
      timezone: 'America/Los_Angeles',
      businessType: { category: '', industry: '' },
      businessHours: {
        monday: { open: '09:00', close: '17:00', closed: false },
        tuesday: { open: '09:00', close: '17:00', closed: false },
        wednesday: { open: '09:00', close: '17:00', closed: false },
        thursday: { open: '09:00', close: '17:00', closed: false },
        friday: { open: '09:00', close: '17:00', closed: false },
        saturday: { open: '09:00', close: '17:00', closed: true },
        sunday: { open: '09:00', close: '17:00', closed: true }
      },
      services: [],
      products: [],
      notifySmsNumbers: [],
      notifyEmailAddresses: [email],
      aiConfig: {
        model: 'gpt-4o-mini',
        voiceName: 'alloy',
        language: 'en-US',
        systemPrompt: ''
      }
    });
    console.log('✅ Created offices/' + officeId + '/meta/settings');

    // 5. Copy user
    const oldUsers = await db.collection('voiceOffices').doc(officeId).collection('users').get();
    for (const doc of oldUsers.docs) {
      await db.collection('offices').doc(officeId).collection('users').doc(doc.id).set(doc.data());
      console.log('✅ Copied user:', doc.data().email);
    }

    console.log('\n🎉 SUCCESS! Ricky\'s account is fixed!');
    console.log('\n⚠️  IMPORTANT: Ricky must log out and log back in to refresh his token!');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
  }

  process.exit(0);
}

fixRicky();
