import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

// ONE-TIME SETUP: Set super admin for sroy@worksidesoftware.com
// This endpoint can only be called once and then should be removed
export async function setupSuperAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Security: Only allow if the authenticated user is sroy@worksidesoftware.com
    const userEmail = req.user?.email;
    
    if (userEmail !== 'sroy@worksidesoftware.com') {
      res.status(403).json({ error: 'This endpoint is only for initial setup by sroy@worksidesoftware.com' });
      return;
    }

    const uid = req.user?.uid;
    if (!uid) {
      res.status(400).json({ error: 'User UID not found' });
      return;
    }

    // Set super admin claims
    await admin.auth().setCustomUserClaims(uid, {
      role: 'super_admin',
      type: 'merxus',
    });

    // Verify
    const updatedUser = await admin.auth().getUser(uid);
    
    console.log(`✅ Super admin role set for: ${userEmail} (${uid})`);

    res.json({
      success: true,
      message: 'Super admin role has been set successfully!',
      email: userEmail,
      uid: uid,
      customClaims: updatedUser.customClaims,
      nextSteps: [
        'Log out of the web app',
        'Log back in to refresh your auth token',
        'Look for "User Management" in the Merxus sidebar'
      ]
    });
  } catch (err: any) {
    console.error('Error setting super admin:', err);
    res.status(500).json({ error: err.message || 'Failed to set super admin' });
  }
}
