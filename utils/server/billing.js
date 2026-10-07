import crypto from 'crypto';

// Abomodell über Stripe (Checkout + Kundenportal + Webhook). Es wird nur die REST-API per fetch genutzt,
// damit keine zusätzliche Abhängigkeit nötig ist. Die Selbstregistrierung ist nur aktiv, wenn
// STRIPE_SECRET_KEY, STRIPE_PRICE_ID und STRIPE_WEBHOOK_SECRET gesetzt sind.
const STRIPE_API = 'https://api.stripe.com/v1';
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export const billingConfigured = () =>
  !!(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRICE_ID?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim());

/** Angaben für die Oberfläche (Preis, rechtliche Seiten) – enthält keine Zugangsdaten. */
export const billingInfo = () => ({
  priceLabel: process.env.SUBSCRIPTION_PRICE_LABEL?.trim() || '',
  trialDays: trialDays(),
  termsUrl: process.env.TERMS_URL?.trim() || '',
  privacyUrl: process.env.PRIVACY_URL?.trim() || '',
  imprintUrl: process.env.IMPRINT_URL?.trim() || ''
});

const trialDays = () => {
  const days = Number.parseInt(process.env.STRIPE_TRIAL_DAYS ?? '', 10);
  return Number.isInteger(days) && days > 0 && days <= 90 ? days : 0;
};

export class BillingError extends Error {}

// Stripe erwartet verschachtelte Parameter als form-urlencoded (a[b]=1, a[0][b]=2)
export function encodeParams(params) {
  const pairs = [];
  const walk = (value, key) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${key}[${index}]`));
    else if (typeof value === 'object') Object.entries(value).forEach(([name, item]) => walk(item, `${key}[${name}]`));
    else pairs.push([key, String(value)]);
  };
  Object.entries(params).forEach(([name, value]) => walk(value, name));
  return new URLSearchParams(pairs).toString();
}

async function stripe(path, { method = 'POST', params = {} } = {}) {
  let response;
  try {
    response = await fetch(`${STRIPE_API}/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY.trim()}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: method === 'GET' ? undefined : encodeParams(params),
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    console.error('Stripe nicht erreichbar:', error.message);
    throw new BillingError('Zahlungsdienst nicht erreichbar.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Stripe-Fehler:', response.status, data.error?.message);
    throw new BillingError('Der Zahlungsdienst hat die Anfrage abgelehnt.');
  }
  return data;
}

// Basis-Adresse der App für die Rücksprung-URLs (APP_URL, sonst aus der Anfrage)
function appUrl(req) {
  if (process.env.APP_URL?.trim()) return process.env.APP_URL.trim().replace(/\/+$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (/^localhost|^127\./.test(host || '') ? 'http' : 'https');
  return `${String(proto).split(',')[0]}://${host}`;
}

/** Stripe-Checkout für ein Abo; liefert die Adresse der Bezahlseite. */
export async function createCheckoutUrl(user, req) {
  const base = appUrl(req);
  const days = trialDays();
  const session = await stripe('checkout/sessions', {
    params: {
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID.trim(), quantity: 1 }],
      client_reference_id: user.id,
      ...(user.stripe_customer_id ? { customer: user.stripe_customer_id } : { customer_email: user.email }),
      subscription_data: { metadata: { user_id: user.id }, ...(days ? { trial_period_days: days } : {}) },
      success_url: `${base}/?checkout=success`,
      cancel_url: `${base}/?checkout=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      locale: 'de',
      ...(process.env.STRIPE_AUTOMATIC_TAX === 'true' ? { automatic_tax: { enabled: true } } : {})
    }
  });
  if (!session.url) throw new BillingError('Keine Bezahlseite erhalten.');
  return session.url;
}

/** Stripe-Kundenportal (Zahlungsmittel, Rechnungen, Kündigung). */
export async function createPortalUrl(user, req) {
  const session = await stripe('billing_portal/sessions', {
    params: { customer: user.stripe_customer_id, return_url: `${appUrl(req)}/` }
  });
  return session.url;
}

/** Beendet das Abo sofort (z. B. wenn der Administrator das Konto löscht). Fehler werden nur protokolliert. */
export async function cancelSubscription(subscriptionId) {
  if (!billingConfigured() || !subscriptionId) return false;
  try {
    await stripe(`subscriptions/${encodeURIComponent(subscriptionId)}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error('Abo konnte nicht beendet werden:', subscriptionId, error.message);
    return false;
  }
}

/** Prüft die Stripe-Signatur eines Webhooks (Header `Stripe-Signature`, Rohdaten des Bodys). */
export function verifyWebhook(rawBody, header, secret, now = Date.now()) {
  const parts = String(header || '').split(',').map((part) => part.trim().split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length || Math.abs(now / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((signature) => {
    const given = Buffer.from(signature, 'hex');
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
}

/** Änderungen an app_users, die ein Stripe-Ereignis bewirkt (oder null, wenn es nicht relevant ist). */
export function userChangesFromEvent(event) {
  const object = event?.data?.object;
  if (!object) return null;

  if (event.type === 'checkout.session.completed' && object.mode === 'subscription') {
    return {
      userId: object.client_reference_id || null,
      customerId: object.customer || null,
      changes: {
        stripe_customer_id: object.customer || null,
        stripe_subscription_id: object.subscription || null,
        // Den endgültigen Status liefert customer.subscription.*; bis dahin gilt bezahlte Buchung als aktiv
        ...(['paid', 'no_payment_required'].includes(object.payment_status) ? { subscription_status: 'active' } : {})
      },
      onlyIfIncomplete: true
    };
  }

  if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
    const periodEnd = object.current_period_end ?? object.items?.data?.[0]?.current_period_end;
    return {
      userId: object.metadata?.user_id || null,
      customerId: object.customer || null,
      changes: {
        stripe_customer_id: object.customer || null,
        stripe_subscription_id: object.id,
        subscription_status: event.type === 'customer.subscription.deleted' ? 'canceled' : object.status,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: !!object.cancel_at_period_end
      }
    };
  }
  return null;
}
