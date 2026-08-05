import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.setHeader(
    'Set-Cookie',
    'session-token=; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  );

  return res.status(200).json({ message: 'Logout successful' });
}
