import { readToken, publicUser } from '../../../utils/server/auth';
import { db, sendDbError } from '../../../utils/server/supabase';
import { createRateLimiter, clientIp } from '../../../utils/server/rateLimit';

const tooManyAttempts = createRateLimiter('verify', 60 * 1000, 10);

// Bestätigt die E-Mail-Adresse über den Link aus der Registrierungs-E-Mail (kein Login nötig).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (await tooManyAttempts(clientIp(req))) return res.status(429).json({ message: 'Zu viele Versuche. Bitte kurz warten.' });
  try {
    const user = await readToken(req.body?.token, 'verify');
    if (!user) return res.status(400).json({ message: 'Der Link ist ungültig oder abgelaufen. Bitte neu anfordern.' });
    if (!user.email_verified_at) {
      const [updated] = await db(`app_users?id=eq.${user.id}`, {
        method: 'PATCH',
        body: { email_verified_at: new Date().toISOString() },
        prefer: 'return=representation'
      });
      return res.status(200).json({ ok: true, user: publicUser(updated) });
    }
    return res.status(200).json({ ok: true, user: publicUser(user) });
  } catch (error) {
    return sendDbError(res, error);
  }
}
