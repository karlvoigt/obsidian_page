import { NextApiRequest, NextApiResponse } from 'next';
import { verifySessionToken } from '../../../lib/auth-session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const token = req.cookies['session-token'];

  if (!token) {
    return res.status(200).json({ authenticated: false });
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return res.status(200).json({ authenticated: false });
  }

  return res.status(200).json({
    authenticated: true,
    user: {
      uid: payload.uid,
      email: payload.email,
      role: payload.role,
    },
  });
}
