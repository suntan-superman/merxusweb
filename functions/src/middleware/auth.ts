import * as admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken & {
    role?: string;
    restaurantId?: string;
    officeId?: string;
    agentId?: string;
    tenantId?: string;
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
    
    // Debug logging
    console.log('🔐 Auth Token Decoded:', {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      restaurantId: decoded.restaurantId,
      officeId: decoded.officeId,
      agentId: decoded.agentId,
      tenantId: decoded.tenantId,
      type: decoded.type,
    });
    
    // Attach user info to request
    req.user = {
      ...decoded,
      role: decoded.role as string | undefined,
      restaurantId: decoded.restaurantId as string | undefined,
      officeId: decoded.officeId as string | undefined,
      agentId: decoded.agentId as string | undefined,
      tenantId: decoded.tenantId as string | undefined,
      type: decoded.type as string | undefined,
    };

    console.log('✅ Auth successful, user attached to request');
    next();
  } catch (error: any) {
    console.error('❌ Auth error:', error.code, error.message);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({ error: 'Token expired' });
    } else if (error.code === 'auth/id-token-revoked') {
      res.status(401).json({ error: 'Token revoked' });
    } else if (error.code === 'auth/argument-error') {
      res.status(401).json({ error: 'Invalid token format' });
    } else {
      res.status(401).json({ error: 'Invalid authentication token', details: error.message });
    }
  }
}

