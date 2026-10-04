import { authRequired, isAuthenticated, passwordMatches, sessionCookie, clearCookie } from '../../../utils/server/auth';

const attempts = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function tooManyAttempts(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > MAX_ATTEMPTS;
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ authRequired: authRequired(), authenticated: !authRequired() || isAuthenticated(req) });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'POST') {
    if (!authRequired()) return res.status(200).json({ ok: true });
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    if (tooManyAttempts(ip)) return res.status(429).json({ message: 'Zu viele Versuche. Bitte kurz warten.' });
    if (!passwordMatches(req.body?.password ?? '')) return res.status(401).json({ message: 'Passwort falsch.' });
    res.setHeader('Set-Cookie', sessionCookie());
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
