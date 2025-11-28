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
    const { id } = req.params;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const doc = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('calls')
      .doc(id)
      .get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Call not found' });
      return;
    }

    const data = doc.data() || {};
    res.json({
      transcript: data.transcript || '',
    });
  } catch (err: any) {
    console.error('Error fetching transcript:', err);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
}

