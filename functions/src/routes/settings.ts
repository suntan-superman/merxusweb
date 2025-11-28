import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

const db = admin.firestore();

export async function getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const doc = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('meta')
      .doc('settings')
      .get();

    if (!doc.exists) {
      // Return default settings if none exist
      res.json({
        restaurantId,
        name: '',
        phoneNumber: '',
        timezone: 'America/Los_Angeles',
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
        notifyEmailAddresses: [],
      });
      return;
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

export async function updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const payload = req.body;
    const ref = db.collection('restaurants').doc(restaurantId).collection('meta').doc('settings');

    await ref.set(
      {
        ...payload,
        restaurantId,
      },
      { merge: true }
    );

    const doc = await ref.get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}

