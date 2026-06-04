import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(455).json({ message: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ valid: false, message: 'Invitation token is required' });
  }

  try {
    const inviteDoc = await db.collection('invitations').doc(token).get();

    if (!inviteDoc.exists) {
      return res.status(200).json({ valid: false, message: 'Invalid invitation link.' });
    }

    const inviteData = inviteDoc.data();
    if (inviteData?.used) {
      return res.status(200).json({ valid: false, message: 'This invitation link has already been used.' });
    }

    if (inviteData?.expiresAt) {
      const expirationDate = inviteData.expiresAt.toDate();
      if (expirationDate < new Date()) {
        return res.status(200).json({ valid: false, message: 'This invitation link has expired.' });
      }
    }

    return res.status(200).json({ valid: true });
  } catch (err: any) {
    console.error('Failed to verify invite token:', err);
    return res.status(500).json({ valid: false, message: 'Internal server error checking invitation' });
  }
}
