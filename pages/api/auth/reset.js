import { readToken, hashPassword, passwordProblem } from '../../../utils/server/auth';
import { db, sendDbError } from '../../../utils/server/supabase';
import { createRateLimiter, clientIp } from '../../../utils/server/rateLimit';

const tooManyAttempts = createRateLimiter('reset', 10 * 60 * 1000, 10);

// Setzt mit dem Link aus der E-Mail ein neues Passwort. Der Link wird dadurch ungültig, ebenso alle bestehenden Sitzungen.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (await tooManyAttempts(clientIp(req))) return res.status(429).json({ message: 'Zu viele Versuche. Bitte später erneut versuchen.' });

  const problem = passwordProblem(req.body?.password);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const user = await readToken(req.body?.token, 'reset');
    if (!user) return res.status(400).json({ message: 'Der Link ist ungültig oder abgelaufen. Bitte neu anfordern.' });
    await db(`app_users?id=eq.${user.id}`, {
      method: 'PATCH',
      body: {
        password_hash: await hashPassword(req.body.password),
        // Wer den Link erhalten hat, kontrolliert das Postfach
        ...(user.email && !user.email_verified_at ? { email_verified_at: new Date().toISOString() } : {})
      }
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return sendDbError(res, error);
  }
}
