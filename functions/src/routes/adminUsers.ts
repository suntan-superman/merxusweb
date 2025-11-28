import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

const db = admin.firestore();

export async function getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const userRole = req.user?.role;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    // Only owner and manager can view users
    if (userRole !== 'owner' && userRole !== 'manager') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const snap = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('users')
      .orderBy('invitedAt', 'desc')
      .get();

    const users = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(users);
  } catch (err: any) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function inviteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const userRole = req.user?.role;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    // Only owner can invite users
    if (userRole !== 'owner') {
      res.status(403).json({ error: 'Only owners can invite users' });
      return;
    }

    const { email, displayName, role } = req.body;

    if (!email || !role) {
      res.status(400).json({ error: 'Email and role are required' });
      return;
    }

    if (!['owner', 'manager', 'staff'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    // Create or get Firebase Auth user
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch {
      // User doesn't exist, create it
      userRecord = await admin.auth().createUser({
        email,
        displayName,
        emailVerified: false,
        disabled: false,
      });
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      restaurantId,
      type: 'restaurant',
    });

    // Create/update Firestore user document
    await db
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

    // Generate password reset link for invitation
    const passwordResetLink = await admin.auth().generatePasswordResetLink(email, {
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?fromInvite=true`,
      handleCodeInApp: false,
    });

    // Get restaurant name for email
    const settingsDoc = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('meta')
      .doc('settings')
      .get();
    const restaurantName = settingsDoc.data()?.name || 'the restaurant';

    // Send invitation email
    const { sendTeamInvitation } = await import('../utils/email');
    const emailSent = await sendTeamInvitation(
      email,
      displayName || email.split('@')[0],
      restaurantName,
      role,
      passwordResetLink
    );

    if (!emailSent) {
      console.warn('Email invitation not sent. Invitation link:', passwordResetLink);
    }

    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      role,
    });
  } catch (err: any) {
    console.error('Error inviting user:', err);
    res.status(500).json({ error: err.message || 'Failed to invite user' });
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const userRole = req.user?.role;
    const { uid } = req.params;
    const { role, disabled } = req.body;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    // Only owner can update users
    if (userRole !== 'owner') {
      res.status(403).json({ error: 'Only owners can update users' });
      return;
    }

    // Update custom claims
    const userRecord = await admin.auth().getUser(uid);
    const currentClaims = (userRecord.customClaims || {}) as any;

    const newClaims = {
      ...currentClaims,
      restaurantId,
      ...(role ? { role } : {}),
    };

    await admin.auth().setCustomUserClaims(uid, newClaims);

    // Update disabled status if provided
    if (typeof disabled === 'boolean') {
      await admin.auth().updateUser(uid, { disabled });
    }

    // Update Firestore
    const ref = db.collection('restaurants').doc(restaurantId).collection('users').doc(uid);
    const updates: any = {};
    if (role) updates.role = role;
    if (typeof disabled === 'boolean') updates.disabled = disabled;

    await ref.set(updates, { merge: true });
    const doc = await ref.get();

    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const userRole = req.user?.role;
    const { uid } = req.params;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    // Only owner can disable users
    if (userRole !== 'owner') {
      res.status(403).json({ error: 'Only owners can disable users' });
      return;
    }

    // Soft delete: mark disabled in Auth + Firestore
    await admin.auth().updateUser(uid, { disabled: true });

    await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('users')
      .doc(uid)
      .set({ disabled: true }, { merge: true });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error disabling user:', err);
    res.status(500).json({ error: 'Failed to disable user' });
  }
}

