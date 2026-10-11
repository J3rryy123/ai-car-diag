import { requireAuth, verifyPassword, clearCookie } from '../../../utils/server/auth';
import { deleteSubscriberAccount } from '../../../utils/server/accountDeletion';
import { sendDbError } from '../../../utils/server/supabase';
import { createRateLimiter, clientIp } from '../../../utils/server/rateLimit';

const tooManyAttempts = createRateLimiter('account-delete', 60 * 1000, 5);

// Abonnenten löschen ihr Konto selbst: Abo wird beendet, Konto und alle Fälle werden entfernt.
// Auch ohne laufendes Abo möglich. Mitarbeiter-Konten verwaltet der Administrator.
export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ message: 'Method not allowed' });
  const session = await requireAuth(req, res, { strict: true, allowUnpaid: true });
  if (!session) return;
  if (session.user?.account_type !== 'subscriber') {
    return res.status(403).json({ message: 'Dieses Konto wird vom Administrator verwaltet.' });
  }
  if (await tooManyAttempts(clientIp(req))) return res.status(429).json({ message: 'Zu viele Versuche. Bitte kurz warten.' });
  if (!(await verifyPassword(String(req.body?.password ?? ''), session.user.password_hash))) {
    return res.status(401).json({ message: 'Passwort falsch.' });
  }

  try {
    if (!(await deleteSubscriberAccount(session.user))) {
      return res.status(502).json({
        message: 'Das Abonnement konnte nicht beendet werden, das Konto wurde nicht gelöscht. Bitte später erneut versuchen oder das Abo im Kundenportal kündigen.'
      });
    }
    res.setHeader('Set-Cookie', clearCookie());
    return res.status(200).json({ ok: true });
  } catch (error) {
    return sendDbError(res, error);
  }
}
