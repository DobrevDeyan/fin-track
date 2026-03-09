/**
 * Firebase Auth Middleware
 *
 * Verifies Firebase ID tokens on incoming requests.
 * Attaches the decoded uid to req.uid.
 *
 * Usage:
 *   app.use('/api/protected', requireAuth, handler)
 */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

// Initialise Firebase Admin once (ADC is already configured for Document AI)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Extend Express Request to carry the verified uid
declare global {
  namespace Express {
    interface Request {
      uid?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected: Bearer <Firebase ID token>',
    });
    return;
  }

  const idToken = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.uid = decoded.uid;
    next();
  } catch (err: any) {
    console.warn('[auth] Token verification failed:', err.message);
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired Firebase ID token.',
    });
  }
}
