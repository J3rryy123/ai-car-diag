import { requireAuth, verifyPassword, hashPassword, passwordProblem, sessionCookie } from '../../../utils/server/auth';
import { db, sendDbError } from '../../../utils/server/supabase';
import { createRateLimiter, clientIp } from '../../../utils/server/rateLimit';

const tooManyAttempts = createRateLimiter('password', 60 * 1000, 5);

// Eigenes Passwort ändern. Bestehende Sitzungen anderer Geräte werden dadurch ungültig.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const session = await requireAuth(req, res, { strict: true, allowUnpaid: true });
  if (!session) return;
  if (!session.user) return res.status(400).json({ message: 'Nur mit Benutzerkonto möglich.' });
  if (await tooManyAttempts(clientIp(req))) return res.status(429).json({ message: 'Zu viele Versuche. Bitte kurz warten.' });

  const { currentPassword, newPassword } = req.body || {};
  const problem = passwordProblem(newPassword);
  if (problem) return res.status(400).json({ message: problem });
  if (!(await verifyPassword(String(currentPassword ?? ''), session.user.password_hash))) {
    return res.status(401).json({ message: 'Aktuelles Passwort falsch.' });
  }

  try {
    const [user] = await db(`app_users?id=eq.${session.user.id}`, {
      method: 'PATCH',
      body: { password_hash: await hashPassword(newPassword) },
      prefer: 'return=representation'
    });
    res.setHeader('Set-Cookie', sessionCookie(user));
    return res.status(200).json({ ok: true });
  } catch (error) {
    return sendDbError(res, error);
  }
}
