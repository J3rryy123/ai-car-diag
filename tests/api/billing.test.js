import crypto from 'crypto';
import { Readable } from 'stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, cookieFrom, mockReq, mockRes, uniqueIp } from '../helpers/http';
import { createFakeDb, uuid } from '../helpers/fakeDb';

const fake = { current: null };

vi.mock('../../utils/server/supabase', async (importOriginal) => ({
  ...(await importOriginal()),
  db: (...args) => fake.current.db(...args),
}));

const WEBHOOK_SECRET = 'whsec_test';
const load = async () => ({
  register: (await import('../../pages/api/auth/register')).default,
  auth: (await import('../../pages/api/auth/index')).default,
  checkout: (await import('../../pages/api/billing/checkout')).default,
  portal: (await import('../../pages/api/billing/portal')).default,
  webhook: (await import('../../pages/api/billing/webhook')).default,
  cases: (await import('../../pages/api/cases/index')).default,
  users: (await import('../../pages/api/users/[id]')).default,
  mod: await import('../../utils/server/auth'),
  billing: await import('../../utils/server/billing'),
});

const signup = { email: 'Kunde@Example.com', username: 'kunde', password: 'langes-passwort', acceptTerms: true };
const stripeCalls = [];

beforeEach(async () => {
  vi.resetModules();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x');
  vi.stubEnv('STRIPE_PRICE_ID', 'price_123');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', WEBHOOK_SECRET);
  vi.stubEnv('APP_URL', 'https://diag.example.com');
  stripeCalls.length = 0;
  vi.stubGlobal('fetch', async (url, init) => {
    stripeCalls.push({ url, init, params: new URLSearchParams(init.body || '') });
    const json = (data, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => data });
    if (url.endsWith('/checkout/sessions')) return json({ url: 'https://checkout.stripe.test/pay' });
    if (url.endsWith('/billing_portal/sessions')) return json({ url: 'https://billing.stripe.test/portal' });
    if (init.method === 'DELETE') return json({ status: 'canceled' });
    return json({ error: { message: 'unerwartet' } }, false);
  });
  const { hashPassword } = await import('../../utils/server/auth');
  fake.current = createFakeDb({
    users: [{ id: uuid(), username: 'chef', display_name: 'Chef', password_hash: await hashPassword('admin-passwort'), role: 'admin', active: true }],
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const subscriber = () => fake.current.state.users.find((u) => u.username === 'kunde');

// Stripe-Webhook mit gültiger Signatur senden
function webhookRequest(event, { secret = WEBHOOK_SECRET, timestamp = Math.floor(Date.now() / 1000) } = {}) {
  const raw = JSON.stringify(event);
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
  return Object.assign(Readable.from([Buffer.from(raw)]), {
    method: 'POST',
    headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` },
  });
}

async function sendWebhook(handler, event, options) {
  const res = mockRes();
  await handler(webhookRequest(event, options), res);
  return res;
}

const subscriptionEvent = (type, user, status, extra = {}) => ({
  id: 'evt_1',
  type,
  data: { object: { id: 'sub_1', customer: 'cus_1', status, metadata: { user_id: user.id }, current_period_end: 1893456000, ...extra } },
});

describe('Registrierung eines externen Benutzers', () => {
  it('legt ein Abo-Konto ohne Zugriff an, meldet an und liefert die Bezahlseite', async () => {
    const { register } = await load();
    const res = await call(register, { body: signup, ip: uniqueIp() });
    expect(res.statusCode).toBe(201);
    expect(res.body.checkoutUrl).toBe('https://checkout.stripe.test/pay');
    expect(res.body.user).toMatchObject({ email: 'kunde@example.com', role: 'user', accountType: 'subscriber', hasAccess: false });
    expect(res.headers['set-cookie']).toMatch(/HttpOnly/);
    expect(subscriber()).toMatchObject({ role: 'user', account_type: 'subscriber', subscription_status: 'incomplete' });
    expect(subscriber().terms_accepted_at).toBeTruthy();

    const params = stripeCalls[0].params;
    expect(params.get('mode')).toBe('subscription');
    expect(params.get('line_items[0][price]')).toBe('price_123');
    expect(params.get('client_reference_id')).toBe(subscriber().id);
    expect(params.get('customer_email')).toBe('kunde@example.com');
    expect(params.get('subscription_data[metadata][user_id]')).toBe(subscriber().id);
    expect(params.get('success_url')).toBe('https://diag.example.com/?checkout=success');
  });

  it('kann nie ein Administrator werden, auch nicht mit manipulierten Feldern', async () => {
    const { register } = await load();
    await call(register, { body: { ...signup, role: 'admin', account_type: 'staff', subscriptionStatus: 'active' }, ip: uniqueIp() });
    expect(subscriber()).toMatchObject({ role: 'user', account_type: 'subscriber', subscription_status: 'incomplete' });
  });

  it('ist ohne Stripe-Konfiguration nicht verfügbar', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const { register } = await load();
    expect((await call(register, { body: signup, ip: uniqueIp() })).statusCode).toBe(404);
    expect(subscriber()).toBeUndefined();
  });

  it('verlangt vorher die Ersteinrichtung (Administrator)', async () => {
    fake.current = createFakeDb();
    const { register } = await load();
    expect((await call(register, { body: signup, ip: uniqueIp() })).statusCode).toBe(409);
  });

  it('prüft E-Mail, Benutzername, Passwort und Zustimmung', async () => {
    const { register } = await load();
    const bad = [
      { ...signup, email: 'keine-mail' },
      { ...signup, username: 'a' },
      { ...signup, password: 'kurz' },
      { ...signup, acceptTerms: false },
      { ...signup, acceptTerms: 'true' },
    ];
    for (const body of bad) expect((await call(register, { body, ip: uniqueIp() })).statusCode).toBe(400);
    expect(fake.current.state.users).toHaveLength(1);
  });

  it('weist doppelte Benutzernamen und E-Mail-Adressen ab', async () => {
    const { register } = await load();
    expect((await call(register, { body: signup, ip: uniqueIp() })).statusCode).toBe(201);
    expect((await call(register, { body: { ...signup, email: 'andere@example.com' }, ip: uniqueIp() })).statusCode).toBe(409);
    expect((await call(register, { body: { ...signup, username: 'anderer' }, ip: uniqueIp() })).statusCode).toBe(409);
  });

  it('legt das Konto auch an, wenn Stripe ausfällt; die Bezahlung lässt sich später starten', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
    const { register } = await load();
    const res = await call(register, { body: signup, ip: uniqueIp() });
    expect(res.statusCode).toBe(201);
    expect(res.body.checkoutUrl).toBeNull();
    expect(subscriber()).toBeDefined();
  });

  it('wird pro IP begrenzt', async () => {
    const { register } = await load();
    const ip = uniqueIp();
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push((await call(register, { body: { ...signup, email: 'x' }, ip })).statusCode);
    expect(codes).toEqual([400, 400, 400, 400, 400, 429, 429]);
  });

  it('wird in /api/auth nur angeboten, wenn Stripe konfiguriert ist', async () => {
    const { auth } = await load();
    const on = await call(auth, { method: 'GET' });
    expect(on.body).toMatchObject({ signupEnabled: true });
    expect(on.body.billing).toBeTruthy();
    vi.stubEnv('STRIPE_PRICE_ID', '');
    const off = await call(auth, { method: 'GET' });
    expect(off.body).toMatchObject({ signupEnabled: false, billing: null });
  });
});

describe('Zugriff nur mit Abo', () => {
  async function registered() {
    const api = await load();
    const res = await call(api.register, { body: signup, ip: uniqueIp() });
    return { ...api, headers: { cookie: cookieFrom(res) } };
  }

  it('sperrt Datenrouten (402), solange kein Abo läuft, lässt Anmeldestatus und Bezahlung aber zu', async () => {
    const { cases, auth, checkout, headers } = await registered();
    const blocked = await call(cases, { method: 'GET', headers });
    expect(blocked.statusCode).toBe(402);
    expect(blocked.body.code).toBe('subscription_required');

    const state = await call(auth, { method: 'GET', headers });
    expect(state.body).toMatchObject({ authenticated: true, user: { hasAccess: false, subscriptionStatus: 'incomplete' } });

    const pay = await call(checkout, { headers, ip: uniqueIp() });
    expect(pay.statusCode).toBe(200);
    expect(pay.body.url).toBe('https://checkout.stripe.test/pay');
  });

  it('schaltet nach dem Webhook frei und sperrt wieder, wenn das Abo endet', async () => {
    const { cases, webhook, headers } = await registered();
    const user = subscriber();

    const paid = await sendWebhook(webhook, {
      id: 'evt_0',
      type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', client_reference_id: user.id, customer: 'cus_1', subscription: 'sub_1', payment_status: 'paid' } },
    });
    expect(paid.statusCode).toBe(200);
    expect(subscriber()).toMatchObject({ stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', subscription_status: 'active' });
    expect((await call(cases, { method: 'GET', headers })).statusCode).toBe(200);

    await sendWebhook(webhook, subscriptionEvent('customer.subscription.updated', user, 'past_due'));
    expect((await call(cases, { method: 'GET', headers })).statusCode).toBe(200); // Kulanzzeit

    await sendWebhook(webhook, subscriptionEvent('customer.subscription.deleted', user, 'canceled'));
    expect(subscriber().subscription_status).toBe('canceled');
    expect((await call(cases, { method: 'GET', headers })).statusCode).toBe(402);
  });

  it('übernimmt Laufzeitende und Kündigung zum Periodenende', async () => {
    const { webhook } = await registered();
    await sendWebhook(webhook, subscriptionEvent('customer.subscription.updated', subscriber(), 'active', { cancel_at_period_end: true }));
    expect(subscriber()).toMatchObject({ cancel_at_period_end: true, current_period_end: '2030-01-01T00:00:00.000Z' });
  });

  it('lässt ein Checkout-Ereignis einen bereits gemeldeten Status nicht überschreiben', async () => {
    const { webhook } = await registered();
    const user = subscriber();
    await sendWebhook(webhook, subscriptionEvent('customer.subscription.updated', user, 'trialing'));
    await sendWebhook(webhook, {
      id: 'evt_2',
      type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', client_reference_id: user.id, customer: 'cus_1', subscription: 'sub_1', payment_status: 'paid' } },
    });
    expect(subscriber().subscription_status).toBe('trialing');
  });

  it('Mitarbeiter und Administratoren brauchen kein Abo', async () => {
    const { mod } = await load();
    expect(mod.hasAccess({ role: 'admin' })).toBe(true);
    expect(mod.hasAccess({ account_type: 'staff', subscription_status: 'none' })).toBe(true);
    expect(mod.hasAccess({ account_type: 'subscriber', subscription_status: 'incomplete' })).toBe(false);
    expect(mod.hasAccess({ account_type: 'subscriber', subscription_status: 'unpaid' })).toBe(false);
  });

  it('trennt die Daten: Abonnenten sehen nur eigene Fälle', async () => {
    const { cases, webhook, headers } = await registered();
    const user = subscriber();
    await sendWebhook(webhook, subscriptionEvent('customer.subscription.updated', user, 'active'));
    fake.current.state.cases.push({ id: uuid(), type: 'obd2', created_at: '2026-01-01T00:00:00Z', created_by_id: fake.current.state.users[0].id, data: {} });

    expect((await call(cases, { method: 'POST', headers, body: { type: 'obd2', code: 'P0301' } })).statusCode).toBe(201);
    const list = await call(cases, { method: 'GET', headers });
    expect(list.body.scope).toBe('own');
    expect(list.body.cases).toHaveLength(1);
  });
});

describe('Stripe-Webhook', () => {
  it('weist falsche und abgelaufene Signaturen sowie fehlende Header ab', async () => {
    const { webhook } = await load();
    const user = { id: uuid() };
    const event = subscriptionEvent('customer.subscription.updated', user, 'active');
    expect((await sendWebhook(webhook, event, { secret: 'falsch' })).statusCode).toBe(400);
    expect((await sendWebhook(webhook, event, { timestamp: Math.floor(Date.now() / 1000) - 3600 })).statusCode).toBe(400);

    const res = mockRes();
    await webhook(Object.assign(Readable.from([Buffer.from('{}')]), { method: 'POST', headers: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('bestätigt unbekannte Ereignisse und unbekannte Konten ohne Änderung', async () => {
    const { webhook } = await load();
    expect((await sendWebhook(webhook, { id: 'e', type: 'ping', data: { object: {} } })).statusCode).toBe(200);
    expect((await sendWebhook(webhook, subscriptionEvent('customer.subscription.updated', { id: uuid() }, 'active'))).statusCode).toBe(200);
  });

  it('ändert keine Mitarbeiter-Konten', async () => {
    const { webhook } = await load();
    const admin = fake.current.state.users[0];
    await sendWebhook(webhook, subscriptionEvent('customer.subscription.updated', admin, 'canceled'));
    expect(admin.subscription_status).toBeUndefined();
  });

  it('antwortet auf Datenbankfehler mit 5xx, damit Stripe wiederholt', async () => {
    const { webhook } = await load();
    const user = { id: uuid() };
    fake.current.db = async () => { throw Object.assign(new Error('unreachable'), { status: undefined }); };
    expect((await sendWebhook(webhook, subscriptionEvent('customer.subscription.updated', user, 'active'))).statusCode).toBe(502);
  });
});

describe('Kundenportal und Löschen', () => {
  it('öffnet das Portal nur mit Stripe-Kunde', async () => {
    const { register, portal } = await load();
    const headers = { cookie: cookieFrom(await call(register, { body: signup, ip: uniqueIp() })) };
    expect((await call(portal, { headers })).statusCode).toBe(400);

    subscriber().stripe_customer_id = 'cus_1';
    const res = await call(portal, { headers });
    expect(res.body.url).toBe('https://billing.stripe.test/portal');
    expect(stripeCalls.at(-1).params.get('customer')).toBe('cus_1');
  });

  it('beendet das Abo, wenn der Administrator das Konto löscht', async () => {
    const { register, users, mod } = await load();
    await call(register, { body: signup, ip: uniqueIp() });
    Object.assign(subscriber(), { stripe_subscription_id: 'sub_9' });

    const admin = fake.current.state.users[0];
    const adminCookie = mod.sessionCookie(admin).split(';')[0];
    const res = await call(users, { method: 'DELETE', headers: { cookie: adminCookie }, query: { id: subscriber().id } });
    expect(res.statusCode).toBe(200);
    expect(stripeCalls.some((c) => c.init.method === 'DELETE' && c.url.endsWith('/subscriptions/sub_9'))).toBe(true);
    expect(subscriber()).toBeUndefined();
  });
});

describe('Hilfsfunktionen', () => {
  it('kodiert verschachtelte Stripe-Parameter', async () => {
    const { billing } = await load();
    expect(billing.encodeParams({ a: 1, b: { c: 'x y' }, d: [{ e: 2 }], f: undefined })).toBe('a=1&b%5Bc%5D=x+y&d%5B0%5D%5Be%5D=2');
  });

  it('leitet den Abo-Status aus Ereignissen ab', async () => {
    const { billing } = await load();
    expect(billing.userChangesFromEvent({ type: 'ping', data: { object: {} } })).toBeNull();
    const deleted = billing.userChangesFromEvent(subscriptionEvent('customer.subscription.deleted', { id: 'u' }, 'active'));
    expect(deleted.changes.subscription_status).toBe('canceled');
  });
});
