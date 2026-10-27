import crypto from 'crypto';
import { cookies } from 'next/headers';

const SECRET_KEY =
  process.env.AUTH_SECRET ||
  process.env.OPENROUTER_API_KEY ||
  process.env.DATABASE_URL ||
  'nalar-enterprise-secret-key-2026';

export const SESSION_COOKIE_NAME = 'nalar_session_token';

export function hashPasswordSecure(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `pbkdf2:${salt}:${hash}`;
}

export function verifyPasswordSecure(password: string, storedHash: string): boolean {
  if (!storedHash.startsWith('pbkdf2:')) {
    const legacyHash = crypto
      .createHash('sha256')
      .update(password + 'nalar_salt_2026')
      .digest('hex');
    return storedHash === legacyHash;
  }

  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const [, salt, originalHash] = parts;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

export interface SessionPayload {
  userId: string;
  email: string;
  exp: number;
}

export function signSessionToken(userId: string, email: string): string {
  const payload: SessionPayload = {
    userId,
    email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload: SessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}
