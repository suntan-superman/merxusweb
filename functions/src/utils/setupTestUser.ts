import * as admin from 'firebase-admin';

/**
 * Helper function to create a test user and set custom claims
 * This should be called from a Cloud Function or admin script
 */
export async function setupTestUser(
  email: string,
  password: string,
  role: 'owner' | 'manager' | 'staff',
  restaurantId: string,
  displayName?: string
) {
  try {
    // Create or get user
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch {
      // User doesn't exist, create it
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || email.split('@')[0],
        emailVerified: false,
      });
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

    console.log(`✅ Created test user: ${email} with role: ${role}, restaurantId: ${restaurantId}`);
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      role,
      restaurantId,
    };
  } catch (error: any) {
    console.error('Error setting up test user:', error);
    throw error;
  }
}

/**
 * Setup a Merxus admin user
 */
export async function setupMerxusAdmin(
  email: string,
  password: string,
  role: 'merxus_admin' | 'merxus_support',
  displayName?: string
) {
  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || email.split('@')[0],
        emailVerified: false,
      });
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      type: 'merxus',
    });

    console.log(`✅ Created Merxus admin: ${email} with role: ${role}`);
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      role,
    };
  } catch (error: any) {
    console.error('Error setting up Merxus admin:', error);
    throw error;
  }
}

