import crypto from 'crypto';

// Zugriffsschutz über ein gemeinsames Passwort (APP_PASSWORD) und ein signiertes Cookie.
const COOKIE_NAME = 'kfz_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export const authRequired = () => !!process.env.APP_PASSWORD;

const secret = () => process.env.SESSION_SECRET || `kfz-session:${process.env.APP_PASSWORD || ''}`;
const sign = (value) => crypto.createHmac('sha256', secret()).update(value).digest('hex');

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export const passwordMatches = (input) =>
  authRequired() &&
  safeEqual(crypto.createHash('sha256').update(String(input)).digest('hex'), crypto.createHash('sha256').update(process.env.APP_PASSWORD).digest('hex'));

export function sessionCookie() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${expires}.${sign(String(expires))}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${secure}`;
}

export const clearCookie = () => `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;

export function isAuthenticated(req) {
  if (!authRequired()) return false;
  const cookie = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return false;
  const [expires, signature] = cookie.slice(COOKIE_NAME.length + 1).split('.');
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  return safeEqual(signature, sign(expires));
}

/**
 * Prüft den Zugriff. Antwortet bei Ablehnung selbst und liefert false zurück.
 * Ohne APP_PASSWORD ist die App offen (nur lokal/Demo); `strict` verlangt in Produktion zwingend ein Passwort.
 */
export function requireAuth(req, res, { strict = false } = {}) {
  if (!authRequired()) {
    if (strict && process.env.NODE_ENV === 'production') {
      res.status(503).json({ code: 'auth_not_configured', message: 'APP_PASSWORD ist nicht gesetzt.' });
      return false;
    }
    return true;
  }
  if (isAuthenticated(req)) return true;
  res.status(401).json({ code: 'unauthorized', message: 'Bitte anmelden.' });
  return false;
}
