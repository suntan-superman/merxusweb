import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

const db = admin.firestore();

// Get voice/office settings
export async function getVoiceSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const officeId = req.user?.officeId;
    if (!officeId) {
      res.status(403).json({ error: 'Office ID required' });
      return;
    }

    const doc = await db
      .collection('offices')
      .doc(officeId)
      .collection('meta')
      .doc('settings')
      .get();

    if (!doc.exists) {
      // Return default settings if none exist
      res.json({
        officeId,
        name: '',
        phoneNumber: '',
        address: '',
        websiteUrl: '',
        timezone: 'America/Los_Angeles',
        twilioPhoneNumber: '',
        twilioNumberSid: '',
        businessHours: {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: false },
          sunday: { open: '09:00', close: '17:00', closed: false },
        },
        aiConfig: {
          model: 'gpt-4o-mini',
          voiceName: 'alloy',
          language: 'en-US',
          systemPrompt: '',
        },
      });
      return;
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error fetching voice settings:', err);
    res.status(500).json({ error: 'Failed to fetch voice settings' });
  }
}

// Update voice/office settings
export async function updateVoiceSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const officeId = req.user?.officeId;
    if (!officeId) {
      res.status(403).json({ error: 'Office ID required' });
      return;
    }

    const payload = req.body;
    const ref = db.collection('offices').doc(officeId).collection('meta').doc('settings');

    await ref.set(
      {
        ...payload,
        officeId,
      },
      { merge: true }
    );

    const doc = await ref.get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error updating voice settings:', err);
    res.status(500).json({ error: 'Failed to update voice settings' });
  }
}

// ========================================
// VOICE USERS MANAGEMENT
// ========================================

// Get office users
export async function getVoiceUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const officeId = req.user?.officeId;
    const userRole = req.user?.role;

    if (!officeId) {
      res.status(403).json({ error: 'Office ID required' });
      return;
    }

    // Only admin can view users
    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const snap = await db
      .collection('offices')
      .doc(officeId)
      .collection('users')
      .orderBy('invitedAt', 'desc')
      .get();

    const users = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(users);
  } catch (err: any) {
    console.error('Error fetching voice users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// Invite office user
export async function inviteVoiceUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const officeId = req.user?.officeId;
    const userRole = req.user?.role;

    if (!officeId) {
      res.status(403).json({ error: 'Office ID required' });
      return;
    }

    // Only admin can invite users
    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Only admins can invite users' });
      return;
    }

    const { email, displayName, role } = req.body;

    if (!email || !role) {
      res.status(400).json({ error: 'Email and role are required' });
      return;
    }

    if (!['admin', 'user', 'viewer'].includes(role)) {
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
      officeId,
      type: 'voice',
    });

    // Create/update Firestore user document
    await db
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

    // Get office name for email
    const settingsDoc = await db
      .collection('offices')
      .doc(officeId)
      .collection('meta')
      .doc('settings')
      .get();
    const officeName = settingsDoc.data()?.name || 'the office';

    // Send invitation email
    const { sendTeamInvitation } = await import('../utils/email');
    const emailSent = await sendTeamInvitation(
      email,
      displayName || email.split('@')[0],
      officeName,
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
    console.error('Error inviting voice user:', err);
    res.status(500).json({ error: err.message || 'Failed to invite user' });
  }
}

// Update office user
export async function updateVoiceUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const officeId = req.user?.officeId;
    const userRole = req.user?.role;
    const { uid } = req.params;
    const { role, disabled } = req.body;

    if (!officeId) {
      res.status(403).json({ error: 'Office ID required' });
      return;
    }

    // Only admin can update users
    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Only admins can update users' });
      return;
    }

    // Update custom claims
    const userRecord = await admin.auth().getUser(uid);
    const currentClaims = (userRecord.customClaims || {}) as any;

    const newClaims = {
      ...currentClaims,
      officeId,
      ...(role ? { role } : {}),
    };

    await admin.auth().setCustomUserClaims(uid, newClaims);

    // Update disabled status if provided
    if (typeof disabled === 'boolean') {
      await admin.auth().updateUser(uid, { disabled });
    }

    // Update Firestore
    const ref = db.collection('offices').doc(officeId).collection('users').doc(uid);
    const updates: any = {};
    if (role) updates.role = role;
    if (typeof disabled === 'boolean') updates.disabled = disabled;

    await ref.set(updates, { merge: true });
    const doc = await ref.get();

    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error updating voice user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

// Delete/disable office user
export async function deleteVoiceUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const officeId = req.user?.officeId;
    const userRole = req.user?.role;
    const { uid } = req.params;

    if (!officeId) {
      res.status(403).json({ error: 'Office ID required' });
      return;
    }

    // Only admin can disable users
    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Only admins can disable users' });
      return;
    }

    // Soft delete: mark disabled in Auth + Firestore
    await admin.auth().updateUser(uid, { disabled: true });

    await db
      .collection('offices')
      .doc(officeId)
      .collection('users')
      .doc(uid)
      .set({ disabled: true }, { merge: true });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error disabling voice user:', err);
    res.status(500).json({ error: 'Failed to disable user' });
  }
}

// ========================================
// CALL ROUTING RULES MANAGEMENT
// ========================================

// Get all routing rules for office
export async function getRoutingRules(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const officeId = req.user?.officeId;

    if (!officeId) {
      res.status(403).json({ error: 'Office ID required' });
      return;
    }

    const snap = await db
      .collection('offices')
      .doc(officeId)
      .collection('routingRules')
      .orderBy('priority', 'asc')
      .get();

    const rules = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(rules);
  } catch (err: any) {
    console.error('Error fetching routing rules:', err);
    res.status(500).json({ error: 'Failed to fetch routing rules' });
  }
}

// Create new routing rule
export async function createRoutingRule(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const officeId = req.user?.officeId;
    const userRole = req.user?.role;

    if (!officeId) {
      res.status(403).json({ error: 'Office ID required' });
      return;
    }

    // Only admin can create rules
    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Only admins can create routing rules' });
      return;
    }

    const {
      name,
      enabled,
      priority,
      conditions,
      action,
      description,
    } = req.body;

    if (!name || !action) {
      res.status(400).json({ error: 'Name and action are required' });
      return;
    }

    const ruleData = {
      name,
      description: description || '',
      enabled: enabled !== false, // Default to true
      priority: priority || 0,
      conditions: conditions || {},
      action: action || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db
      .collection('offices')
      .doc(officeId)
      .collection('routingRules')
      .add(ruleData);

    const doc = await docRef.get();

    res.status(201).json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (err: any) {
    console.error('Error creating routing rule:', err);
    res.status(500).json({ error: 'Failed to create routing rule' });
  }
}

// Update routing rule
export async function updateRoutingRule(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const officeId = req.user?.officeId;
    const userRole = req.user?.role;
    const { ruleId } = req.params;

    if (!officeId) {
      res.status(403).json({ error: 'Office ID required' });
      return;
    }

    // Only admin can update rules
    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Only admins can update routing rules' });
      return;
    }

    const ref = db
      .collection('offices')
      .doc(officeId)
      .collection('routingRules')
      .doc(ruleId);

    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Routing rule not found' });
      return;
    }

    const updates = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await ref.update(updates);
    const updatedDoc = await ref.get();

    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (err: any) {
    console.error('Error updating routing rule:', err);
    res.status(500).json({ error: 'Failed to update routing rule' });
  }
}

// Delete routing rule
export async function deleteRoutingRule(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const officeId = req.user?.officeId;
    const userRole = req.user?.role;
    const { ruleId } = req.params;

    if (!officeId) {
      res.status(403).json({ error: 'Office ID required' });
      return;
    }

    // Only admin can delete rules
    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Only admins can delete routing rules' });
      return;
    }

    await db
      .collection('offices')
      .doc(officeId)
      .collection('routingRules')
      .doc(ruleId)
      .delete();

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting routing rule:', err);
    res.status(500).json({ error: 'Failed to delete routing rule' });
  }
}

