import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

const db = admin.firestore();

export async function getOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const limit = Number(req.query.limit || 50);
    const orderType = req.query.orderType as string | undefined;

    let query: admin.firestore.Query = db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (orderType) {
      query = query.where('orderType', '==', orderType);
    }

    const snap = await query.get();
    const orders = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(orders);
  } catch (err: any) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

export async function updateOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    const updates = req.body;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const ref = db.collection('restaurants').doc(restaurantId).collection('orders').doc(id);
    await ref.update(updates);

    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err: any) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
}

