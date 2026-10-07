import { requireAuth } from '../../../utils/server/auth';
import { billingConfigured, createCheckoutUrl } from '../../../utils/server/billing';
import { createRateLimiter, clientIp } from '../../../utils/server/rateLimit';

const tooManyAttempts = createRateLimiter('checkout', 60 * 1000, 10);

// Startet (erneut) die Bezahlung für ein Abo-Konto ohne laufendes Abo.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!billingConfigured()) return res.status(404).json({ message: 'Abonnements sind nicht aktiviert.' });
  const session = await requireAuth(req, res, { strict: true, allowUnpaid: true });
  if (!session) return;
  const user = session.user;
  if (user?.account_type !== 'subscriber') return res.status(400).json({ message: 'Für dieses Konto ist kein Abonnement nötig.' });
  if (['active', 'trialing', 'past_due'].includes(user.subscription_status)) {
    return res.status(409).json({ message: 'Es besteht bereits ein Abonnement. Verwaltung über „Abo verwalten“.' });
  }
  if (await tooManyAttempts(user.id || clientIp(req))) return res.status(429).json({ message: 'Zu viele Versuche. Bitte kurz warten.' });

  try {
    return res.status(200).json({ url: await createCheckoutUrl(user, req) });
  } catch (error) {
    return res.status(502).json({ message: error.message || 'Bezahlvorgang konnte nicht gestartet werden.' });
  }
}
