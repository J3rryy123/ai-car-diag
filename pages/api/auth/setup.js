import {
  authMode, countUsers, hashPassword, passwordMatches, passwordProblem, sessionCookie, publicUser, USERNAME_PATTERN
} from '../../../utils/server/auth';
import { db, sendDbError } from '../../../utils/server/supabase';
import { createRateLimiter, clientIp } from '../../../utils/server/rateLimit';

const tooManyAttempts = createRateLimiter('setup', 60 * 1000, 5);

// Legt den ersten Administrator an, solange noch kein Benutzer existiert.
// Ist APP_PASSWORD gesetzt, dient es als Einrichtungscode (in Produktion zwingend).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if ((await authMode()) !== 'users') return res.status(400).json({ message: 'Benutzerverwaltung benötigt die Datenbank.' });
  if (await tooManyAttempts(clientIp(req))) return res.status(429).json({ message: 'Zu viele Versuche. Bitte kurz warten.' });

  try {
    if ((await countUsers()) > 0) return res.status(409).json({ message: 'Es existiert bereits ein Benutzer.' });

    if (process.env.APP_PASSWORD) {
      if (!passwordMatches(req.body?.setupCode ?? '')) return res.status(401).json({ message: 'Einrichtungscode (APP_PASSWORD) falsch.' });
    } else if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ message: 'Für die Ersteinrichtung in Produktion muss APP_PASSWORD als Einrichtungscode gesetzt sein.' });
    }

    const username = String(req.body?.username ?? '').trim().toLowerCase();
    const displayName = String(req.body?.displayName ?? '').trim().slice(0, 100) || username;
    const password = req.body?.password;
    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({ message: 'Benutzername: 3–32 Zeichen (a–z, 0–9, Punkt, Unterstrich, Bindestrich).' });
    }
    const problem = passwordProblem(password);
    if (problem) return res.status(400).json({ message: problem });

    const [user] = await db('app_users', {
      method: 'POST',
      body: { username, display_name: displayName, password_hash: await hashPassword(password), role: 'admin' },
      prefer: 'return=representation'
    });
    res.setHeader('Set-Cookie', sessionCookie(user));
    return res.status(201).json({ ok: true, user: publicUser(user) });
  } catch (error) {
    return sendDbError(res, error);
  }
}
