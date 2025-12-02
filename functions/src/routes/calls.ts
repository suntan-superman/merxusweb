import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

const db = admin.firestore();

export async function getCalls(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const limit = Number(req.query.limit || 50);

    const snap = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('calls')
      .orderBy('startedAt', 'desc')
      .limit(limit)
      .get();

    const calls = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(calls);
  } catch (err: any) {
    console.error('Error fetching calls:', err);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
}

export async function getCallTranscript(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const officeId = req.user?.officeId;
    const tenantId = req.user?.tenantId;
    const tenantType = req.user?.type; // 'restaurant' or 'voice'
    const { id } = req.params;

    // Support both restaurant and voice calls
    // Calls are stored in callSessions collection at root level
    const callDoc = await db.collection('callSessions').doc(id).get();

    if (!callDoc.exists) {
      res.status(404).json({ error: 'Call not found' });
      return;
    }

    const callData = callDoc.data() || {};
    
    // Verify the user has access to this call
    const callRestaurantId = callData.restaurantId || callData.tenantId;
    const callOfficeId = callData.officeId || callData.tenantId;

    // Check access based on tenant type
    if (tenantType === 'voice' || officeId) {
      // Voice user - must match officeId
      if (callOfficeId !== officeId && callOfficeId !== tenantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    } else if (tenantType === 'restaurant' || restaurantId) {
      // Restaurant user - must match restaurantId
      if (callRestaurantId !== restaurantId && callRestaurantId !== tenantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    } else {
      // No tenant ID - deny access
      res.status(403).json({ error: 'Tenant ID required' });
      return;
    }

    // Return transcript data
    res.json({
      transcript: callData.transcript || callData.assistantTranscript || callData.callerTranscript || '',
      callerTranscript: callData.callerTranscript || '',
      assistantTranscript: callData.assistantTranscript || '',
    });
  } catch (err: any) {
    console.error('Error fetching transcript:', err);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
}

