import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import * as admin from 'firebase-admin';
import { db } from '../../../lib/firebase-admin';
import { verifySessionToken } from '../../../lib/auth-session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const sessionToken = req.cookies['session-token'];

  if (!sessionToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const payload = await verifySessionToken(sessionToken);

  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  try {
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    await db.collection('invitations').doc(inviteToken).set({
      token: inviteToken,
      used: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      invitedBy: payload.uid
    });

    return res.status(200).json({ token: inviteToken });
  } catch (err: any) {
    console.error('Failed to generate invite:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
