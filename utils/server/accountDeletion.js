import { db } from './supabase';
import { cancelSubscription } from './billing';

/**
 * Löscht ein Abo-Konto samt Diagnosefällen (DSGVO: Recht auf Löschung).
 * Zuerst wird das Stripe-Abo beendet; gelingt das nicht, bricht der Vorgang ab, damit nicht weiter abgerechnet wird.
 * Rechnungsdaten bleiben bei Stripe (gesetzliche Aufbewahrung). Liefert false, wenn das Abo nicht beendet werden konnte.
 */
export async function deleteSubscriberAccount(user) {
  if (!(await cancelSubscription(user.stripe_subscription_id))) return false;
  await db(`cases?created_by_id=eq.${user.id}`, { method: 'DELETE' });
  await db(`app_users?id=eq.${user.id}`, { method: 'DELETE' });
  return true;
}
