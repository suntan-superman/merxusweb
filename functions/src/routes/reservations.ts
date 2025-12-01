import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

const db = admin.firestore();

export async function getReservations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const limit = Number(req.query.limit || 50);
    const status = req.query.status as string | undefined;

    let query: admin.firestore.Query = db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('reservations')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snap = await query.get();
    const reservations = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(reservations);
  } catch (err: any) {
    console.error('Error fetching reservations:', err);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
}

export async function getReservation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const ref = db.collection('restaurants').doc(restaurantId).collection('reservations').doc(id);
    const doc = await ref.get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error fetching reservation:', err);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
}

export async function createReservation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const data = req.body;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const reservationData = {
      customerName: data.customerName || 'Unknown',
      customerPhone: data.customerPhone || null,
      partySize: data.partySize || null,
      date: data.date || null,
      time: data.time || null,
      specialRequests: data.specialRequests || null,
      status: data.status || 'confirmed',
      source: data.source || 'manual',
      notes: data.notes || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('reservations')
      .add(reservationData);

    const created = await ref.get();
    res.status(201).json({ id: created.id, ...created.data() });
  } catch (err: any) {
    console.error('Error creating reservation:', err);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
}

export async function updateReservation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    const updates = req.body;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    // Add updatedAt timestamp
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const ref = db.collection('restaurants').doc(restaurantId).collection('reservations').doc(id);
    await ref.update(updates);

    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err: any) {
    console.error('Error updating reservation:', err);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
}

export async function deleteReservation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    await db.collection('restaurants').doc(restaurantId).collection('reservations').doc(id).delete();
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting reservation:', err);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
}

