import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Refresh user custom claims
 * This endpoint fixes missing tenantId in custom claims
 * POST /auth/refresh-claims
 */
export async function refreshClaims(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get current user record
    const userRecord = await admin.auth().getUser(userId);
    const currentClaims = userRecord.customClaims || {};

    console.log('Current claims:', currentClaims);

    // Compute tenantId if missing
    const tenantId = currentClaims.tenantId || 
                     currentClaims.restaurantId || 
                     currentClaims.officeId || 
                     currentClaims.agentId;

    if (!tenantId) {
      res.status(400).json({ 
        error: 'No tenant ID found in user claims. Please contact support.',
        currentClaims,
      });
      return;
    }

    // If tenantId is already set, no need to update
    if (currentClaims.tenantId) {
      res.json({ 
        message: 'Claims are already up to date',
        claims: currentClaims,
        needsUpdate: false,
      });
      return;
    }

    // Update claims to include tenantId
    const updatedClaims = {
      ...currentClaims,
      tenantId: tenantId,
    };

    await admin.auth().setCustomUserClaims(userId, updatedClaims);

    console.log('Updated claims:', updatedClaims);

    res.json({
      message: 'Claims updated successfully. Please log out and log back in for changes to take effect.',
      oldClaims: currentClaims,
      newClaims: updatedClaims,
      needsUpdate: true,
    });
  } catch (error: any) {
    console.error('Error refreshing claims:', error);
    res.status(500).json({ error: error.message || 'Failed to refresh claims' });
  }
}

/**
 * Get current user claims
 * GET /auth/claims
 */
export async function getClaims(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const userRecord = await admin.auth().getUser(userId);
    const claims = userRecord.customClaims || {};

    res.json({
      uid: userId,
      email: userRecord.email,
      claims: claims,
    });
  } catch (error: any) {
    console.error('Error getting claims:', error);
    res.status(500).json({ error: error.message || 'Failed to get claims' });
  }
}
