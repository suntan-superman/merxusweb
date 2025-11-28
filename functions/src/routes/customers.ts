import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

const db = admin.firestore();

export async function getCustomers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const limit = Number(req.query.limit || 100);
    const search = (req.query.search as string | undefined)?.trim();

    const customersRef = db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('customers');

    let snap;
    if (search) {
      // Simple approach: fetch subset and filter in memory
      snap = await customersRef.orderBy('name').limit(limit).get();
      const q = search.toLowerCase();
      const customers = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((c: any) => {
          const name = (c.name || '').toLowerCase();
          const phone = (c.phone || '').toLowerCase();
          return name.includes(q) || phone.includes(q);
        });
      res.json(customers);
      return;
    } else {
      snap = await customersRef.orderBy('lastOrderAt', 'desc').limit(limit).get();
    }

    const customers = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(customers);
  } catch (err: any) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
}

export async function getCustomerDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const customerDoc = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('customers')
      .doc(id)
      .get();

    if (!customerDoc.exists) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const customer = { id: customerDoc.id, ...customerDoc.data() };

    const ordersSnap = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('orders')
      .where('customerId', '==', id)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const recentOrders = ordersSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        createdAt: data.createdAt,
        total: data.total,
        orderType: data.orderType,
        source: data.source,
      };
    });

    res.json({ ...customer, recentOrders });
  } catch (err: any) {
    console.error('Error fetching customer detail:', err);
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
}

export async function updateCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    const { tags, notes } = req.body;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const ref = db.collection('restaurants').doc(restaurantId).collection('customers').doc(id);
    await ref.update({
      tags: tags || [],
      notes: notes || '',
    });

    const doc = await ref.get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
}

