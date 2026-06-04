import { SignJWT, jwtVerify } from 'jose';

const secretStr = process.env.SESSION_SECRET || 'placeholder_session_secret_change_me_in_production_to_be_32_chars';
const JWT_SECRET = new TextEncoder().encode(secretStr);

export interface SessionPayload {
  uid: string;
  email?: string;
  role: 'admin' | 'authenticated';
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({
    uid: payload.uid,
    email: payload.email,
    role: payload.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
  return token;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return {
      uid: payload.uid as string,
      email: payload.email as string,
      role: payload.role as 'admin' | 'authenticated'
    };
  } catch (err) {
    return null;
  }
}
