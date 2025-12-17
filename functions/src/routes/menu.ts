import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

const db = admin.firestore();

export async function getMenu(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    // Get all menu items (we'll sort in memory to avoid requiring composite index)
    const snap = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('menuItems')
      .get();

    const items = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{ id: string; category?: string; name?: string; [key: string]: any }>;

    // Sort by category, then by name (in memory)
    items.sort((a, b) => {
      const categoryCompare = (a.category || '').localeCompare(b.category || '');
      if (categoryCompare !== 0) return categoryCompare;
      return (a.name || '').localeCompare(b.name || '');
    });

    res.json(items);
  } catch (err: any) {
    console.error('Error fetching menu:', err);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
}

export async function createMenuItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const payload = req.body;

    const ref = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('menuItems')
      .add({
        restaurantId,
        name: payload.name,
        description: payload.description || '',
        price: payload.price,
        category: payload.category,
        isAvailable: payload.isAvailable ?? true,
        tags: payload.tags || [],
      });

    const doc = await ref.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error creating menu item:', err);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
}

export async function updateMenuItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    const payload = req.body;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const ref = db.collection('restaurants').doc(restaurantId).collection('menuItems').doc(id);
    await ref.set(
      {
        restaurantId,
        name: payload.name,
        description: payload.description || '',
        price: payload.price,
        category: payload.category,
        isAvailable: payload.isAvailable ?? true,
        tags: payload.tags || [],
      },
      { merge: true }
    );

    const doc = await ref.get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error updating menu item:', err);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
}

export async function deleteMenuItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('menuItems')
      .doc(id)
      .delete();

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting menu item:', err);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
}

export async function toggleAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    const { isAvailable } = req.body;

    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const ref = db.collection('restaurants').doc(restaurantId).collection('menuItems').doc(id);
    await ref.update({ isAvailable });

    const doc = await ref.get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error updating availability:', err);
    res.status(500).json({ error: 'Failed to update availability' });
  }
}

export async function importMenuItems(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const { items, mode = 'add' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Items array is required and must not be empty' });
      return;
    }

    if (!['add', 'replace'].includes(mode)) {
      res.status(400).json({ error: 'Mode must be "add" or "replace"' });
      return;
    }

    let replaced = 0;

    // If mode is 'replace', delete all existing menu items first
    if (mode === 'replace') {
      const existing = await db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('menuItems')
        .get();

      replaced = existing.size;

      // Delete in batches
      const batch = admin.firestore().batch();
      existing.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // Import new items in batches (Firestore batch limit is 500)
    const collectionRef = db.collection('restaurants').doc(restaurantId).collection('menuItems');
    let batch = admin.firestore().batch();
    let batchCount = 0;
    let success = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Validate required fields
        if (!item.name || !item.price) {
          failed++;
          errors.push(`Row ${i + 1}: Missing required fields (name, price)`);
          continue;
        }

        const docRef = collectionRef.doc();
        batch.set(docRef, {
          ...item,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batchCount++;
        success++;

        // Commit batch every 500 items
        if (batchCount === 500) {
          await batch.commit();
          batch = admin.firestore().batch();
          batchCount = 0;
        }
      } catch (err: any) {
        failed++;
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    // Commit remaining items
    if (batchCount > 0) {
      await batch.commit();
    }

    res.json({
      success,
      failed,
      replaced: mode === 'replace' ? replaced : 0,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (err: any) {
    console.error('Error importing menu items:', err);
    res.status(500).json({ error: 'Failed to import menu items: ' + err.message });
  }
}

