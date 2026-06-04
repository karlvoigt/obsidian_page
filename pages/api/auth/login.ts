import { NextApiRequest, NextApiResponse } from 'next';
import { auth as adminAuth, db } from '../../../lib/firebase-admin';
import { createSessionToken } from '../../../lib/auth-session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'ID token is required' });
  }

  try {
    // 1. Verify the Firebase ID Token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || null;

    // 2. Check if the user is registered in Firestore
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(403).json({ 
        message: 'Access Denied. You must be invited to log in to this site.' 
      });
    }

    const userData = userDoc.data();
    const role = userData?.role === 'admin' ? 'admin' : 'authenticated';

    // 3. Create the custom session token
    const token = await createSessionToken({ uid, email, role });

    // 4. Set HttpOnly Cookie
    res.setHeader(
      'Set-Cookie',
      `session-token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800` // 7 days
    );

    return res.status(200).json({
      message: 'Login successful',
      user: { uid, email, role }
    });
  } catch (err: any) {
    console.error('Login verification error:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
