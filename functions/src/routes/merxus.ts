import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

const db = admin.firestore();

// Helper to check if user is Merxus admin
function requireMerxusAdmin(req: AuthenticatedRequest, res: Response): boolean {
  const userRole = req.user?.role;
  if (userRole !== 'merxus_admin' && userRole !== 'merxus_support') {
    res.status(403).json({ error: 'Merxus admin access required' });
    return false;
  }
  return true;
}

// Create new restaurant
export async function createRestaurant(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { restaurant, manager } = req.body;

    if (!restaurant.name || !restaurant.email || !restaurant.phoneNumber) {
      res.status(400).json({ error: 'Restaurant name, email, and phone are required' });
      return;
    }

    if (!manager.email || !manager.displayName) {
      res.status(400).json({ error: 'Manager email and name are required' });
      return;
    }

    // Generate restaurant ID
    const restaurantId = `rest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create restaurant document
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.set({
      email: restaurant.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      disabled: false,
    });

    // Default AI prompt (Universal Restaurant Prompt)
    const defaultPrompt = `You are the friendly AI phone assistant for this restaurant.
Your job is to greet callers, answer questions accurately, and take orders or reservations professionally.

FOLLOW THESE RULES:

1. Menu Accuracy
   - Only mention items that exist in the restaurant's menu provided in your system instructions.
   - If the caller asks for something not on the menu, offer the closest valid alternative.
   - Never invent dishes, prices, or specials.

2. Communication Style
   - Speak clearly, warmly, and concisely.
   - Keep the conversation moving — don't over-talk.
   - Ask clarifying questions only when needed.

3. Order Taking
   - Follow the Merxus Order Capture Rules provided in your system instructions.
   - Always confirm each item, quantity, and modifiers.
   - Read back the full order at the end before submitting.

4. Boundaries
   - Do NOT provide medical, nutritional, or legal advice.
   - Never give cooking instructions or proprietary details.
   - Transfer to a human when the caller demands it.

5. Tone
   - Friendly, professional, and helpful.
   - If the restaurant is busy, apologize for delays politely.

You are the AI assistant for this restaurant.
Use the restaurant's cuisine style and personality in your tone.`;

    // Create settings document
    await restaurantRef.collection('meta').doc('settings').set({
      restaurantId,
      name: restaurant.name,
      email: restaurant.email,
      phoneNumber: restaurant.phoneNumber,
      address: restaurant.address || '',
      timezone: restaurant.timezone || 'America/Los_Angeles',
      businessHours: {
        monday: { open: '11:00', close: '21:00', closed: false },
        tuesday: { open: '11:00', close: '21:00', closed: false },
        wednesday: { open: '11:00', close: '21:00', closed: false },
        thursday: { open: '11:00', close: '21:00', closed: false },
        friday: { open: '11:00', close: '21:00', closed: false },
        saturday: { open: '11:00', close: '21:00', closed: false },
        sunday: { open: '11:00', close: '21:00', closed: false },
      },
      notifySmsNumbers: [],
      notifyEmailAddresses: [restaurant.email],
      aiConfig: {
        model: 'gpt-4o-mini',
        voiceName: 'alloy',
        language: 'en-US',
        systemPrompt: defaultPrompt,
      },
    });

    // Create manager/owner user
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(manager.email);
      // User exists, update their claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'owner',
        restaurantId,
        type: 'restaurant',
      });
    } catch {
      // User doesn't exist, create it
      userRecord = await admin.auth().createUser({
        email: manager.email,
        displayName: manager.displayName,
        emailVerified: false,
        disabled: false,
      });

      // Set custom claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'owner',
        restaurantId,
        type: 'restaurant',
      });
    }

    // Create user document in Firestore
    await restaurantRef.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: manager.displayName,
      role: 'owner',
      invitedAt: admin.firestore.FieldValue.serverTimestamp(),
      disabled: false,
    });

    // Generate password reset link for invitation
    const passwordResetLink = await admin.auth().generatePasswordResetLink(manager.email, {
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?fromInvite=true&restaurantId=${restaurantId}`,
      handleCodeInApp: false,
    });

    // Send invitation email (non-blocking - don't fail restaurant creation if email fails)
    try {
      const { sendRestaurantInvitation } = await import('../utils/email');
      const emailSent = await sendRestaurantInvitation(
        manager.email,
        manager.displayName,
        restaurant.name,
        passwordResetLink
      );

      if (!emailSent) {
        console.warn('Email invitation not sent. Invitation link:', passwordResetLink);
      }
    } catch (emailError: any) {
      // Log but don't fail - restaurant is already created
      console.error('Error sending invitation email (non-fatal):', emailError);
      console.warn('Restaurant created successfully, but email not sent. Invitation link:', passwordResetLink);
    }

    res.status(201).json({
      restaurantId,
      message: 'Restaurant created successfully',
      invitationLink: passwordResetLink, // Include in response for testing
    });
  } catch (err: any) {
    console.error('Error creating restaurant:', err);
    res.status(500).json({ error: err.message || 'Failed to create restaurant' });
  }
}

// Resend invitation email to restaurant owner/manager
export async function resendInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { restaurantId } = req.params;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant ID required' });
      return;
    }

    // Get restaurant settings to get the name
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const settingsDoc = await restaurantRef.collection('meta').doc('settings').get();
    if (!settingsDoc.exists) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }
    const settings = settingsDoc.data();
    const restaurantName = settings?.name || 'the restaurant';

    // Find owner/manager in users subcollection
    const usersSnapshot = await restaurantRef.collection('users').where('role', 'in', ['owner', 'manager']).limit(1).get();
    
    if (usersSnapshot.empty) {
      res.status(404).json({ error: 'No owner or manager found for this restaurant' });
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userEmail = userData.email;
    const displayName = userData.displayName || userEmail.split('@')[0];

    // Generate password reset link
    const passwordResetLink = await admin.auth().generatePasswordResetLink(userEmail, {
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?fromInvite=true&restaurantId=${restaurantId}`,
      handleCodeInApp: false,
    });

    // Send invitation email (non-blocking)
    let emailSent = false;
    try {
      const { sendRestaurantInvitation } = await import('../utils/email');
      emailSent = await sendRestaurantInvitation(
        userEmail,
        displayName,
        restaurantName,
        passwordResetLink
      );
    } catch (emailError: any) {
      console.error('Error sending invitation email:', emailError);
    }

    res.json({
      success: true,
      message: emailSent 
        ? 'Invitation email sent successfully' 
        : 'Invitation link generated (email may not have been sent)',
      invitationLink: passwordResetLink, // Include for manual sending if needed
      email: userEmail,
    });
  } catch (err: any) {
    console.error('Error resending invitation:', err);
    res.status(500).json({ error: err.message || 'Failed to resend invitation' });
  }
}

// Restaurants
export async function getAllRestaurants(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    // Check if we should include disabled restaurants
    const includeDisabled = req.query.includeDisabled === 'true';
    
    let query: admin.firestore.Query = db.collection('restaurants');
    
    // Filter out disabled by default
    if (!includeDisabled) {
      query = query.where('disabled', '==', false);
    }
    
    const snap = await query.get();

    const restaurants = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        
        // Get settings
        const settingsDoc = await doc.ref.collection('meta').doc('settings').get();
        const settings = settingsDoc.data() || {};

        // Count orders
        const ordersSnap = await doc.ref.collection('orders').get();
        const totalOrders = ordersSnap.size;

        // Handle createdAt - could be Timestamp, Date, or string
        let createdAt: string | undefined;
        if (data.createdAt) {
          try {
            // If it's a Firestore Timestamp, convert it
            if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
              createdAt = data.createdAt.toDate().toISOString();
            } else if (data.createdAt instanceof Date) {
              createdAt = data.createdAt.toISOString();
            } else if (data.createdAt.seconds) {
              // Firestore Timestamp with seconds property
              createdAt = new Date(data.createdAt.seconds * 1000).toISOString();
            } else if (typeof data.createdAt === 'string') {
              createdAt = data.createdAt;
            }
          } catch (err) {
            console.warn('Error parsing createdAt:', err);
          }
        }
        // Fallback to document creation time
        if (!createdAt && doc.createTime) {
          try {
            createdAt = doc.createTime.toDate().toISOString();
          } catch (err) {
            console.warn('Error parsing createTime:', err);
          }
        }

        return {
          id: doc.id,
          restaurantId: doc.id,
          name: settings.name || '',
          email: data.email || '',
          disabled: data.disabled || false,
          totalOrders,
          createdAt,
        };
      })
    );

    res.json(restaurants);
  } catch (err: any) {
    console.error('Error fetching restaurants:', err);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
}

export async function getRestaurant(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { restaurantId } = req.params;
    const doc = await db.collection('restaurants').doc(restaurantId).get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    const data = doc.data();
    const settingsDoc = await doc.ref.collection('meta').doc('settings').get();
    const settings = settingsDoc.data() || {};

    const ordersSnap = await doc.ref.collection('orders').get();
    const totalOrders = ordersSnap.size;

    res.json({
      id: doc.id,
      restaurantId: doc.id,
      ...data,
      ...settings,
      totalOrders,
    });
  } catch (err: any) {
    console.error('Error fetching restaurant:', err);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
}

export async function updateRestaurant(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { restaurantId } = req.params;
    const updates = req.body;

    const ref = db.collection('restaurants').doc(restaurantId);
    
    // Update main restaurant doc (disabled flag)
    if (updates.disabled !== undefined) {
      await ref.update({ disabled: updates.disabled });
    }

    // Update settings - support all settings fields
    const settingsRef = ref.collection('meta').doc('settings');
    const settingsUpdates: any = {};
    
    // Basic info
    if (updates.name !== undefined) settingsUpdates.name = updates.name;
    if (updates.email !== undefined) settingsUpdates.email = updates.email;
    if (updates.phoneNumber !== undefined) settingsUpdates.phoneNumber = updates.phoneNumber;
    if (updates.address !== undefined) settingsUpdates.address = updates.address;
    if (updates.timezone !== undefined) settingsUpdates.timezone = updates.timezone;
    
    // Business hours
    if (updates.businessHours !== undefined) settingsUpdates.businessHours = updates.businessHours;
    
    // AI config
    if (updates.aiConfig !== undefined) settingsUpdates.aiConfig = updates.aiConfig;
    if (updates.systemPrompt !== undefined) {
      // Store system prompt in aiConfig for consistency
      if (!settingsUpdates.aiConfig) {
        const currentSettings = await settingsRef.get();
        settingsUpdates.aiConfig = currentSettings.data()?.aiConfig || {};
      }
      settingsUpdates.aiConfig.systemPrompt = updates.systemPrompt;
    }
    
    // Notification settings
    if (updates.notifySmsNumbers !== undefined) settingsUpdates.notifySmsNumbers = updates.notifySmsNumbers;
    if (updates.notifyEmailAddresses !== undefined) settingsUpdates.notifyEmailAddresses = updates.notifyEmailAddresses;
    
    // Twilio number
    if (updates.twilioNumberSid !== undefined) settingsUpdates.twilioNumberSid = updates.twilioNumberSid;
    
    // Update settings if any changes
    if (Object.keys(settingsUpdates).length > 0) {
      await settingsRef.set(settingsUpdates, { merge: true });
    }

    // If disabling, also disable all users
    if (updates.disabled === true) {
      const usersSnap = await ref.collection('users').get();
      const batch = db.batch();
      usersSnap.docs.forEach((userDoc) => {
        const uid = userDoc.id;
        admin.auth().updateUser(uid, { disabled: true }).catch(console.error);
        batch.update(userDoc.ref, { disabled: true });
      });
      await batch.commit();
    }

    // If enabling, also enable all users
    if (updates.disabled === false) {
      const usersSnap = await ref.collection('users').get();
      const batch = db.batch();
      usersSnap.docs.forEach((userDoc) => {
        const uid = userDoc.id;
        admin.auth().updateUser(uid, { disabled: false }).catch(console.error);
        batch.update(userDoc.ref, { disabled: false });
      });
      await batch.commit();
    }

    // Return updated restaurant with settings
    const doc = await ref.get();
    const settingsDoc = await settingsRef.get();
    const settings = settingsDoc.data() || {};
    
    res.json({ 
      id: doc.id, 
      restaurantId: doc.id,
      ...doc.data(),
      ...settings,
    });
  } catch (err: any) {
    console.error('Error updating restaurant:', err);
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
}

// Delete restaurant (only if no data)
export async function deleteRestaurant(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { restaurantId } = req.params;
    const ref = db.collection('restaurants').doc(restaurantId);

    // Check if restaurant exists
    const restaurantDoc = await ref.get();
    if (!restaurantDoc.exists) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    // Check for data in subcollections
    const [ordersSnap, callsSnap, customersSnap, menuItemsSnap] = await Promise.all([
      ref.collection('orders').limit(1).get(),
      ref.collection('calls').limit(1).get(),
      ref.collection('customers').limit(1).get(),
      ref.collection('menuItems').limit(1).get(),
    ]);

    const hasData = 
      ordersSnap.size > 0 ||
      callsSnap.size > 0 ||
      customersSnap.size > 0 ||
      menuItemsSnap.size > 0;

    if (hasData) {
      res.status(400).json({ 
        error: 'Cannot delete restaurant with existing data. Please disable it instead.',
        hasData: true,
      });
      return;
    }

    // Get all users for this restaurant
    const usersSnap = await ref.collection('users').get();
    
    // Delete all users from Firebase Auth
    const deleteUserPromises = usersSnap.docs.map(async (userDoc) => {
      const uid = userDoc.id;
      try {
        await admin.auth().deleteUser(uid);
      } catch (err: any) {
        console.warn(`Error deleting user ${uid}:`, err.message);
        // Continue even if user deletion fails
      }
    });
    await Promise.all(deleteUserPromises);

    // Delete all subcollections (users, settings, etc.)
    const batch = db.batch();
    
    // Delete users subcollection
    usersSnap.docs.forEach((doc) => batch.delete(doc.ref));
    
    // Delete settings
    const settingsRef = ref.collection('meta').doc('settings');
    const settingsDoc = await settingsRef.get();
    if (settingsDoc.exists) {
      batch.delete(settingsRef);
    }

    await batch.commit();

    // Finally, delete the restaurant document
    await ref.delete();

    res.json({ success: true, message: 'Restaurant deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting restaurant:', err);
    res.status(500).json({ error: err.message || 'Failed to delete restaurant' });
  }
}

// Analytics
export async function getSystemAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    // Get all restaurants
    const restaurantsSnap = await db.collection('restaurants').get();
    const restaurantIds = restaurantsSnap.docs.map((d) => d.id);

    // Aggregate stats
    let totalOrders = 0;
    let totalCalls = 0;
    let totalUsers = 0;
    const ordersByStatus: Record<string, number> = {};
    const ordersByType: Record<string, number> = {};
    const usersByRole: Record<string, number> = {};

    // Count orders and calls across all restaurants
    for (const restaurantId of restaurantIds) {
      const ordersSnap = await db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('orders')
        .get();
      
      totalOrders += ordersSnap.size;
      ordersSnap.docs.forEach((doc) => {
        const data = doc.data();
        const status = data.status || 'pending';
        const type = data.orderType || 'unknown';
        ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
        ordersByType[type] = (ordersByType[type] || 0) + 1;
      });

      const callsSnap = await db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('calls')
        .get();
      totalCalls += callsSnap.size;

      const usersSnap = await db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('users')
        .get();
      
      totalUsers += usersSnap.size;
      usersSnap.docs.forEach((doc) => {
        const data = doc.data();
        const role = data.role || 'unknown';
        usersByRole[role] = (usersByRole[role] || 0) + 1;
      });
    }

    // Get calls this month and calculate avg duration
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    let callsThisMonth = 0;
    let totalCallDuration = 0;
    let callsWithDuration = 0;
    
    for (const restaurantId of restaurantIds) {
      const callsSnap = await db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('calls')
        .where('startedAt', '>=', admin.firestore.Timestamp.fromDate(thisMonth))
        .get();
      callsThisMonth += callsSnap.size;
      
      // Calculate total duration for average
      callsSnap.docs.forEach((doc) => {
        const data = doc.data();
        const duration = data.durationSec || data.duration || 0;
        if (duration > 0) {
          totalCallDuration += duration;
          callsWithDuration++;
        }
      });
    }

    // Calculate avg duration in minutes
    const avgCallDuration = callsWithDuration > 0 
      ? Math.round((totalCallDuration / callsWithDuration) / 60 * 10) / 10 // Round to 1 decimal
      : 0;

    // Calculate active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let activeUsers = 0;
    for (const restaurantId of restaurantIds) {
      const usersSnap = await db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('users')
        .get();
      
      usersSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.lastLoginAt) {
          const lastLogin = data.lastLoginAt.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt);
          if (lastLogin >= thirtyDaysAgo) {
            activeUsers++;
          }
        } else {
          // If no lastLoginAt, consider them active if recently invited
          const invitedAt = data.invitedAt ? new Date(data.invitedAt) : null;
          if (invitedAt && invitedAt >= thirtyDaysAgo) {
            activeUsers++;
          }
        }
      });
    }

    res.json({
      totalRestaurants: restaurantsSnap.size,
      totalOrders,
      totalCalls,
      callsThisMonth,
      totalUsers,
      activeUsers,
      ordersByStatus,
      ordersByType,
      usersByRole,
      avgCallDuration,
    });
  } catch (err: any) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

// System Settings
export async function getSystemSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const doc = await db.collection('system').doc('settings').get();
    
    if (!doc.exists) {
      res.json({});
      return;
    }

    res.json(doc.data());
  } catch (err: any) {
    console.error('Error fetching system settings:', err);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
}

export async function updateSystemSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const payload = req.body;
    await db.collection('system').doc('settings').set(payload, { merge: true });

    const doc = await db.collection('system').doc('settings').get();
    res.json(doc.data());
  } catch (err: any) {
    console.error('Error updating system settings:', err);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
}

// Menu management for Merxus admins
export async function getRestaurantMenu(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { restaurantId } = req.params;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant ID required' });
      return;
    }

    // Get all menu items (we'll sort in memory to avoid requiring composite index)
    const snap = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('menuItems')
      .get();

    const items = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{ id: string; category?: string; name?: string; [key: string]: any }>;

    // Sort by category, then by name (in memory)
    items.sort((a, b) => {
      const categoryCompare = (a.category || '').localeCompare(b.category || '');
      if (categoryCompare !== 0) return categoryCompare;
      return (a.name || '').localeCompare(b.name || '');
    });

    res.json(items);
  } catch (err: any) {
    console.error('Error fetching restaurant menu:', err);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
}

export async function createRestaurantMenuItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { restaurantId } = req.params;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant ID required' });
      return;
    }

    const payload = req.body;

    const ref = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('menuItems')
      .add({
        restaurantId,
        name: payload.name,
        description: payload.description || '',
        price: payload.price,
        category: payload.category,
        isAvailable: payload.isAvailable ?? true,
        tags: payload.tags || [],
      });

    const doc = await ref.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error creating menu item:', err);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
}

export async function updateRestaurantMenuItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { restaurantId, itemId } = req.params;
    if (!restaurantId || !itemId) {
      res.status(400).json({ error: 'Restaurant ID and Item ID required' });
      return;
    }

    const payload = req.body;

    const ref = db.collection('restaurants').doc(restaurantId).collection('menuItems').doc(itemId);
    await ref.set(
      {
        restaurantId,
        name: payload.name,
        description: payload.description || '',
        price: payload.price,
        category: payload.category,
        isAvailable: payload.isAvailable ?? true,
        tags: payload.tags || [],
      },
      { merge: true }
    );

    const doc = await ref.get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error updating menu item:', err);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
}

export async function deleteRestaurantMenuItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { restaurantId, itemId } = req.params;
    if (!restaurantId || !itemId) {
      res.status(400).json({ error: 'Restaurant ID and Item ID required' });
      return;
    }

    await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('menuItems')
      .doc(itemId)
      .delete();

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting menu item:', err);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
}

export async function toggleRestaurantMenuItemAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { restaurantId, itemId } = req.params;
    const { isAvailable } = req.body;

    if (!restaurantId || !itemId) {
      res.status(400).json({ error: 'Restaurant ID and Item ID required' });
      return;
    }

    const ref = db.collection('restaurants').doc(restaurantId).collection('menuItems').doc(itemId);
    await ref.update({ isAvailable });

    const doc = await ref.get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error updating availability:', err);
    res.status(500).json({ error: 'Failed to update availability' });
  }
}
