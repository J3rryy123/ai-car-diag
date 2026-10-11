import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, cookieFrom, mockReq, uniqueIp } from '../helpers/http';
import { createFakeDb, uuid } from '../helpers/fakeDb';

const fake = { current: null };

vi.mock('../../utils/server/supabase', async (importOriginal) => ({
  ...(await importOriginal()),
  db: (...args) => fake.current.db(...args),
}));

const signup = { email: 'Kunde@Example.com', username: 'kunde', password: 'langes-passwort', acceptTerms: true };
const sent = [];
let mailFails;
let api;

const tokenFrom = (mail, param) => new URL(/https?:\/\/\S+/.exec(mail.text)[0]).searchParams.get(param);
const lastMail = () => sent.at(-1);
const subscriber = () => fake.current.state.users.find((u) => u.username === 'kunde');

beforeEach(async () => {
  vi.resetModules();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x');
  vi.stubEnv('STRIPE_PRICE_ID', 'price_123');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
  vi.stubEnv('APP_URL', 'https://diag.example.com');
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubEnv('MAIL_FROM', 'Test <noreply@example.com>');
  sent.length = 0;
  mailFails = false;
  vi.stubGlobal('fetch', async (url, init) => {
    if (url === 'https://api.resend.com/emails') {
      if (mailFails) return { ok: false, status: 500, text: async () => 'boom' };
      sent.push({ ...JSON.parse(init.body), auth: init.headers.Authorization });
      return { ok: true, status: 200, text: async () => '{}' };
    }
    if (url.endsWith('/checkout/sessions')) return { ok: true, status: 200, json: async () => ({ url: 'https://checkout.stripe.test/pay' }) };
    throw new Error(`unerwartet: ${url}`);
  });

  api = {
    auth: await import('../../utils/server/auth'),
    register: (await import('../../pages/api/auth/register')).default,
    authApi: (await import('../../pages/api/auth/index')).default,
    verify: (await import('../../pages/api/auth/verify-email')).default,
    resend: (await import('../../pages/api/auth/resend-verification')).default,
    forgot: (await import('../../pages/api/auth/forgot')).default,
    reset: (await import('../../pages/api/auth/reset')).default,
    checkout: (await import('../../pages/api/billing/checkout')).default,
  };
  fake.current = createFakeDb({
    users: [{ id: uuid(), username: 'chef', display_name: 'Chef', password_hash: await api.auth.hashPassword('admin-passwort'), role: 'admin', active: true }],
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const register = async (body = signup) => {
  const res = await call(api.register, { body, ip: uniqueIp() });
  return { res, headers: { cookie: cookieFrom(res) } };
};

describe('E-Mail-Bestätigung bei der Registrierung', () => {
  it('sendet einen Bestätigungslink und startet die Bezahlung noch nicht', async () => {
    const { res } = await register();
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ checkoutUrl: null, verificationRequired: true, verificationSent: true });
    expect(res.body.user.emailVerified).toBe(false);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: ['kunde@example.com'], from: 'Test <noreply@example.com>', auth: 'Bearer re_test' });
    expect(sent[0].text).toContain('https://diag.example.com/?verify=');
  });

  it('bestätigt die Adresse mit dem Link; danach darf die Bezahlung starten', async () => {
    const { headers } = await register();
    const blocked = await call(api.checkout, { headers, ip: uniqueIp() });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.body.code).toBe('email_unverified');

    const ok = await call(api.verify, { body: { token: tokenFrom(lastMail(), 'verify') }, ip: uniqueIp() });
    expect(ok.statusCode).toBe(200);
    expect(subscriber().email_verified_at).toBeTruthy();
    // Ein zweiter Klick auf den Link ist harmlos
    expect((await call(api.verify, { body: { token: tokenFrom(lastMail(), 'verify') }, ip: uniqueIp() })).statusCode).toBe(200);

    const pay = await call(api.checkout, { headers, ip: uniqueIp() });
    expect(pay.body.url).toBe('https://checkout.stripe.test/pay');
  });

  it('weist falsche, manipulierte, abgelaufene und zweckfremde Token ab', async () => {
    await register();
    const token = tokenFrom(lastMail(), 'verify');
    const bad = [token.slice(0, -3) + 'abc', 'quatsch', '', undefined, `${token}.x`];
    for (const t of bad) expect((await call(api.verify, { body: { token: t }, ip: uniqueIp() })).statusCode).toBe(400);
    // Ein Bestätigungs-Token taugt nicht zum Zurücksetzen des Passworts
    expect((await call(api.reset, { body: { token, password: 'neues-passwort' }, ip: uniqueIp() })).statusCode).toBe(400);
    expect(subscriber().email_verified_at).toBeUndefined();

    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 25 * 3600 * 1000 });
    expect((await call(api.verify, { body: { token }, ip: uniqueIp() })).statusCode).toBe(400);
    vi.useRealTimers();
  });

  it('sendet auf Wunsch erneut, begrenzt die Häufigkeit und nur für unbestätigte Abo-Konten', async () => {
    const { headers } = await register();
    expect((await call(api.resend, { headers })).statusCode).toBe(200);
    expect(sent).toHaveLength(2);
    expect((await call(api.resend, { headers })).statusCode).toBe(200);
    expect((await call(api.resend, { headers })).statusCode).toBe(200);
    expect((await call(api.resend, { headers })).statusCode).toBe(429);

    subscriber().email_verified_at = '2026-01-01T00:00:00Z';
    expect((await call(api.resend, { headers })).statusCode).toBe(409);
    expect((await call(api.resend, {})).statusCode).toBe(401);
  });

  it('legt das Konto auch an, wenn der Mail-Dienst ausfällt', async () => {
    mailFails = true;
    const { res } = await register();
    expect(res.statusCode).toBe(201);
    expect(res.body.verificationSent).toBe(false);
    expect(subscriber()).toBeDefined();
  });

  it('ein nie bestätigtes, unbezahltes Konto blockiert seine Adresse nicht; bestätigte schon', async () => {
    await register();
    const second = await register({ ...signup, username: 'echter-kunde' });
    expect(second.res.statusCode).toBe(201);
    expect(fake.current.state.users.filter((u) => u.email === 'kunde@example.com')).toHaveLength(1);
    expect(fake.current.state.users.find((u) => u.email === 'kunde@example.com').username).toBe('echter-kunde');

    fake.current.state.users.find((u) => u.username === 'echter-kunde').email_verified_at = '2026-01-01T00:00:00Z';
    expect((await register({ ...signup, username: 'dritter' })).res.statusCode).toBe(409);
  });

  it('ohne Mail-Dienst läuft die Registrierung wie bisher direkt zur Bezahlung', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const { res, headers } = await register();
    expect(res.body.checkoutUrl).toBe('https://checkout.stripe.test/pay');
    expect(sent).toHaveLength(0);
    expect((await call(api.checkout, { headers, ip: uniqueIp() })).statusCode).toBe(200);
    expect((await call(api.authApi, { method: 'GET' })).body.mailEnabled).toBe(false);
  });
});

describe('Passwort vergessen', () => {
  const addUser = async (extra = {}) => {
    const user = { id: uuid(), username: 'anna', email: 'anna@example.com', display_name: 'Anna', password_hash: await api.auth.hashPassword('altes-passwort'), role: 'user', active: true, ...extra };
    fake.current.state.users.push(user);
    return user;
  };

  it('sendet einen Link; das neue Passwort gilt, der Link nur einmal, alte Sitzungen enden', async () => {
    const user = await addUser();
    const oldCookie = api.auth.sessionCookie(user).split(';')[0];

    expect((await call(api.forgot, { body: { email: ' Anna@Example.com ' }, ip: uniqueIp() })).statusCode).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(['anna@example.com']);
    const token = tokenFrom(lastMail(), 'reset');

    const short = await call(api.reset, { body: { token, password: 'kurz' }, ip: uniqueIp() });
    expect(short.statusCode).toBe(400);

    const done = await call(api.reset, { body: { token, password: 'neues-passwort' }, ip: uniqueIp() });
    expect(done.statusCode).toBe(200);
    expect(await api.auth.verifyPassword('neues-passwort', user.password_hash)).toBe(true);
    expect(user.email_verified_at).toBeTruthy();
    expect((await api.auth.getSession(mockReq({ headers: { cookie: oldCookie } }))).authenticated).toBe(false);

    // Der Link ist verbraucht
    const again = await call(api.reset, { body: { token, password: 'nochmal-anders' }, ip: uniqueIp() });
    expect(again.statusCode).toBe(400);
    expect(await api.auth.verifyPassword('neues-passwort', user.password_hash)).toBe(true);
  });

  it('antwortet für unbekannte, gesperrte und fehlende Adressen gleich und sendet nichts', async () => {
    await addUser({ username: 'gesperrt', email: 'gesperrt@example.com', active: false });
    const known = await call(api.forgot, { body: { email: 'anna@example.com' }, ip: uniqueIp() });
    const replies = [];
    for (const email of ['niemand@example.com', 'gesperrt@example.com', '', 'kein-email']) {
      replies.push(await call(api.forgot, { body: { email }, ip: uniqueIp() }));
    }
    for (const r of replies) expect(r.body).toEqual(known.body);
    expect(sent).toHaveLength(0);
  });

  it('begrenzt pro Adresse (3 pro Stunde) und pro IP', async () => {
    await addUser();
    for (let i = 0; i < 5; i++) await call(api.forgot, { body: { email: 'anna@example.com' }, ip: uniqueIp() });
    expect(sent).toHaveLength(3);

    const ip = uniqueIp();
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push((await call(api.forgot, { body: { email: `x${i}@example.com` }, ip })).statusCode);
    expect(codes).toEqual([200, 200, 200, 200, 200, 429, 429]);
  });

  it('lässt sich nicht mit abgelaufenem oder fremdem Token missbrauchen', async () => {
    const user = await addUser();
    const other = await addUser({ username: 'bernd', email: 'bernd@example.com' });
    await call(api.forgot, { body: { email: 'anna@example.com' }, ip: uniqueIp() });
    const token = tokenFrom(lastMail(), 'reset');

    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 2 * 3600 * 1000 });
    expect((await call(api.reset, { body: { token, password: 'neues-passwort' }, ip: uniqueIp() })).statusCode).toBe(400);
    vi.useRealTimers();

    // Token von Anna lässt sich nicht auf Bernd ummünzen
    const forged = Buffer.from(`reset.${other.id}.${Math.floor(Date.now() / 1000) + 3600}`).toString('base64url') + '.' + token.split('.')[1];
    expect((await call(api.reset, { body: { token: forged, password: 'neues-passwort' }, ip: uniqueIp() })).statusCode).toBe(400);
    expect(await api.auth.verifyPassword('altes-passwort', user.password_hash)).toBe(true);
    expect(await api.auth.verifyPassword('altes-passwort', other.password_hash)).toBe(true);
  });

  it('ist ohne Mail-Dienst nicht verfügbar', async () => {
    vi.stubEnv('MAIL_FROM', '');
    expect((await call(api.forgot, { body: { email: 'anna@example.com' }, ip: uniqueIp() })).statusCode).toBe(404);
    expect((await call(api.authApi, { method: 'GET' })).body.mailEnabled).toBe(false);
  });
});
