import crypto from 'node:crypto';

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

interface SessionRecord {
  userId: number;
  expiresAt: number;
}

const sessions = new Map<string, SessionRecord>();

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) {
    return false;
  }
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

export function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + TOKEN_TTL_MS
  });
  return token;
}

export function resolveSession(token: string) {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + TOKEN_TTL_MS;
  return session.userId;
}

export function revokeSession(token: string) {
  sessions.delete(token);
}
