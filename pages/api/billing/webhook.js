import { db, sendDbError } from '../../../utils/server/supabase';
import { billingConfigured, verifyWebhook, userChangesFromEvent } from '../../../utils/server/billing';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 1024 * 1024;

// Die Signatur gilt für die unveränderten Rohdaten, daher kein Body-Parser
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('payload too large');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Stripe meldet Abo-Änderungen (Zahlung, Verlängerung, Kündigung, Zahlungsausfall) und schaltet damit den Zugriff.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!billingConfigured()) return res.status(404).json({ message: 'Abonnements sind nicht aktiviert.' });

  let raw;
  try {
    raw = await readRawBody(req);
  } catch {
    return res.status(413).json({ message: 'Anfrage zu groß.' });
  }
  if (!verifyWebhook(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET.trim())) {
    return res.status(400).json({ message: 'Ungültige Signatur.' });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return res.status(400).json({ message: 'Ungültige Daten.' });
  }

  try {
    const update = userChangesFromEvent(event);
    if (!update) return res.status(200).json({ received: true });

    let user = null;
    if (update.userId && UUID.test(update.userId)) {
      user = (await db(`app_users?id=eq.${update.userId}&select=*&limit=1`))[0] || null;
    }
    if (!user && update.customerId) {
      user = (await db(`app_users?stripe_customer_id=eq.${encodeURIComponent(update.customerId)}&select=*&limit=1`))[0] || null;
    }
    if (!user || user.account_type !== 'subscriber') {
      // 200, damit Stripe nicht ewig wiederholt (z. B. Konto wurde inzwischen gelöscht)
      console.warn('Stripe-Ereignis ohne passendes Abo-Konto:', event.type, event.id);
      return res.status(200).json({ received: true });
    }

    const changes = { ...update.changes };
    // Ein Checkout-Ereignis darf einen bereits gemeldeten Abo-Status nicht überschreiben
    if (update.onlyIfIncomplete && user.subscription_status !== 'incomplete') delete changes.subscription_status;
    await db(`app_users?id=eq.${user.id}`, { method: 'PATCH', body: changes });
    return res.status(200).json({ received: true });
  } catch (error) {
    // Fehler → Stripe wiederholt die Zustellung automatisch
    return sendDbError(res, error);
  }
}
