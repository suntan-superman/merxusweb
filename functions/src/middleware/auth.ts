import * as admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken & {
    role?: string;
    restaurantId?: string;
    type?: string;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      res.status(401).json({ error: 'Missing authentication token' });
      return;
    }

    // Verify the ID token
    const decoded = await admin.auth().verifyIdToken(token);
    
    // Attach user info to request
    req.user = {
      ...decoded,
      role: decoded.role as string | undefined,
      restaurantId: decoded.restaurantId as string | undefined,
      type: decoded.type as string | undefined,
    };

    next();
  } catch (error: any) {
    console.error('Auth error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({ error: 'Token expired' });
    } else if (error.code === 'auth/id-token-revoked') {
      res.status(401).json({ error: 'Token revoked' });
    } else {
      res.status(401).json({ error: 'Invalid authentication token' });
    }
  }
}

