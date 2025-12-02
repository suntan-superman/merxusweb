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

