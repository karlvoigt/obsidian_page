import { NextApiRequest, NextApiResponse } from 'next';
import * as admin from 'firebase-admin';
import { auth as adminAuth, db } from '../../../lib/firebase-admin';
import { createSessionToken } from '../../../lib/auth-session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { idToken, token: inviteToken } = req.body;

  if (!idToken || !inviteToken) {
    return res.status(400).json({ message: 'ID token and invitation token are required' });
  }

  try {
    // 1. Verify the Firebase ID Token to fetch identity
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || null;

    // 2. Validate invitation and create user atomically in a transaction
    await db.runTransaction(async (transaction) => {
      const inviteRef = db.collection('invitations').doc(inviteToken);
      const inviteDoc = await transaction.get(inviteRef);

      if (!inviteDoc.exists) {
        throw new Error('Invalid invitation link. Please request a new one.');
      }

      const inviteData = inviteDoc.data();
      if (inviteData?.used) {
        throw new Error('This invitation link has already been used.');
      }

      if (inviteData?.expiresAt) {
        const expirationDate = inviteData.expiresAt.toDate();
        if (expirationDate < new Date()) {
          throw new Error('This invitation link has expired.');
        }
      }

      // Check if user is already registered in our users table
      const userRef = db.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);

      if (userDoc.exists) {
        // Just link the invite to them or let them pass
        transaction.update(inviteRef, {
          used: true,
          registeredUser: uid,
          usedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
      }

      // Register the new user
      transaction.set(userRef, {
        email,
        role: 'authenticated',
        registeredAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Mark invitation token as used
      transaction.update(inviteRef, {
        used: true,
        registeredUser: uid,
        usedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // 3. Create the session token
    const token = await createSessionToken({ uid, email, role: 'authenticated' });

    // 4. Set HttpOnly Cookie
    res.setHeader(
      'Set-Cookie',
      `session-token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800` // 7 days
    );

    return res.status(200).json({
      message: 'Registration successful',
      user: { uid, email, role: 'authenticated' }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(400).json({ message: err.message || 'Registration failed' });
  }
}
