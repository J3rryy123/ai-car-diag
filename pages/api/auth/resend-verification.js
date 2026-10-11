import { requireAuth, issueToken } from '../../../utils/server/auth';
import { mailConfigured, sendVerificationMail } from '../../../utils/server/mail';
import { createRateLimiter } from '../../../utils/server/rateLimit';

const tooManyAttempts = createRateLimiter('resend-verification', 10 * 60 * 1000, 3);

// Schickt die Bestätigungs-E-Mail erneut an das angemeldete Abo-Konto.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!mailConfigured()) return res.status(404).json({ message: 'E-Mail-Versand ist nicht eingerichtet.' });
  const session = await requireAuth(req, res, { strict: true, allowUnpaid: true });
  if (!session) return;
  const user = session.user;
  if (user?.account_type !== 'subscriber' || !user.email) return res.status(400).json({ message: 'Für dieses Konto ist keine Bestätigung nötig.' });
  if (user.email_verified_at) return res.status(409).json({ message: 'Die E-Mail-Adresse ist bereits bestätigt.' });
  if (await tooManyAttempts(user.id)) return res.status(429).json({ message: 'Bitte einige Minuten warten, bevor du die E-Mail erneut anforderst.' });

  try {
    await sendVerificationMail(user, issueToken('verify', user, 24 * 3600), req);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(502).json({ message: error.message });
  }
}
