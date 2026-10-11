import { requireAuth } from '../../../utils/server/auth';
import { billingConfigured, createPortalUrl } from '../../../utils/server/billing';

// Stripe-Kundenportal: Zahlungsmittel ändern, Rechnungen ansehen, Abo kündigen.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!billingConfigured()) return res.status(404).json({ message: 'Abonnements sind nicht aktiviert.' });
  const session = await requireAuth(req, res, { strict: true, allowUnpaid: true });
  if (!session) return;
  const user = session.user;
  if (user?.account_type !== 'subscriber' || !user.stripe_customer_id) {
    return res.status(400).json({ message: 'Für dieses Konto gibt es kein Abonnement.' });
  }

  try {
    return res.status(200).json({ url: await createPortalUrl(user, req) });
  } catch (error) {
    return res.status(502).json({ message: error.message || 'Kundenportal konnte nicht geöffnet werden.' });
  }
}
