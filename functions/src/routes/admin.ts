import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { setupTestUser, setupMerxusAdmin } from '../utils/setupTestUser';

/**
 * Admin-only route to create test users
 * This should be protected and only accessible to Merxus admins
 */
export async function createTestUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Check if user is Merxus admin
    const userRole = req.user?.role;
    if (userRole !== 'merxus_admin' && userRole !== 'merxus_support') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { email, password, role, restaurantId, displayName, type } = req.body;

    if (!email || !password || !role) {
      res.status(400).json({ error: 'Email, password, and role are required' });
      return;
    }

    let result;
    if (type === 'merxus') {
      if (role !== 'merxus_admin' && role !== 'merxus_support') {
        res.status(400).json({ error: 'Invalid Merxus role' });
        return;
      }
      result = await setupMerxusAdmin(email, password, role, displayName);
    } else {
      if (!restaurantId) {
        res.status(400).json({ error: 'Restaurant ID required for restaurant users' });
        return;
      }
      if (role !== 'owner' && role !== 'manager' && role !== 'staff') {
        res.status(400).json({ error: 'Invalid restaurant role' });
        return;
      }
      result = await setupTestUser(email, password, role, restaurantId, displayName);
    }

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creating test user:', error);
    res.status(500).json({ error: error.message || 'Failed to create test user' });
  }
}

