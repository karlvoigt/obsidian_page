import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firebase-admin';
import { verifySessionToken } from '../../../lib/auth-session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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
    const invitesSnapshot = await db
      .collection('invitations')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const invitations = invitesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        token: data.token,
        used: data.used,
        createdAt: data.createdAt?.toDate().toISOString() || null,
        expiresAt: data.expiresAt?.toDate().toISOString() || null,
        registeredUser: data.registeredUser || null,
        invitedBy: data.invitedBy || null,
      };
    });

    return res.status(200).json({ invitations });
  } catch (err: any) {
    console.error('Failed to fetch invitations:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
