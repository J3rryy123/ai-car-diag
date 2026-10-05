import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, cookieFrom, mockReq, mockRes, uniqueIp } from '../helpers/http';
import { createFakeDb, uuid } from '../helpers/fakeDb';

const fake = { current: null };

// Datenbankzugriff ersetzen, Rest von supabase.js (dbConfigured, sendDbError) bleibt echt
vi.mock('../../utils/server/supabase', async (importOriginal) => ({
  ...(await importOriginal()),
  db: (...args) => fake.current.db(...args),
}));

const loadAuthApi = async () => ({
  auth: (await import('../../pages/api/auth/index')).default,
  password: (await import('../../pages/api/auth/password')).default,
  setup: (await import('../../pages/api/auth/setup')).default,
  mod: await import('../../utils/server/auth'),
});

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Anmeldung mit gemeinsamem Passwort (APP_PASSWORD, ohne Datenbank)', () => {
  beforeEach(() => {
    vi.stubEnv('APP_PASSWORD', 'geheim-123');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  });

  it('meldet Modus und fehlende Anmeldung', async () => {
    const { auth } = await loadAuthApi();
    const res = await call(auth, { method: 'GET' });
    expect(res.body).toMatchObject({ mode: 'legacy', authRequired: true, authenticated: false });
  });

  it('lehnt ein falsches Passwort ab und setzt keinen Cookie', async () => {
    const { auth } = await loadAuthApi();
    const res = await call(auth, { body: { password: 'falsch' }, ip: uniqueIp() });
    expect(res.statusCode).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('akzeptiert das richtige Passwort; der Cookie schaltet geschützte Routen frei', async () => {
    const { auth, mod } = await loadAuthApi();
    const login = await call(auth, { body: { password: 'geheim-123' }, ip: uniqueIp() });
    expect(login.statusCode).toBe(200);
    expect(login.headers['set-cookie']).toMatch(/HttpOnly/);
    expect(login.headers['set-cookie']).toMatch(/SameSite=Strict/);

    const anonymous = mockRes();
    expect(await mod.requireAuth(mockReq({ method: 'GET' }), anonymous)).toBeNull();
    expect(anonymous.statusCode).toBe(401);

    const authed = mockRes();
    const session = await mod.requireAuth(mockReq({ method: 'GET', headers: { cookie: cookieFrom(login) } }), authed);
    expect(session).toMatchObject({ mode: 'legacy', authenticated: true });
  });

  it('weist manipulierte und abgelaufene Cookies ab', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { auth, mod } = await loadAuthApi();
    const login = await call(auth, { body: { password: 'geheim-123' }, ip: uniqueIp() });
    const cookie = cookieFrom(login);

    const tampered = cookie.slice(0, -4) + 'abcd';
    expect((await mod.getSession(mockReq({ headers: { cookie: tampered } }))).authenticated).toBe(false);
    expect((await mod.getSession(mockReq({ headers: { cookie } }))).authenticated).toBe(true);

    vi.setSystemTime(Date.now() + 8 * 24 * 3600 * 1000);
    expect((await mod.getSession(mockReq({ headers: { cookie } }))).authenticated).toBe(false);
  });

  it('sperrt nach 5 Versuchen pro Minute (429)', async () => {
    const { auth } = await loadAuthApi();
    const ip = uniqueIp();
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push((await call(auth, { body: { password: 'falsch' }, ip })).statusCode);
    expect(codes).toEqual([401, 401, 401, 401, 401, 429, 429]);
  });

  it('Abmelden löscht den Cookie', async () => {
    const { auth } = await loadAuthApi();
    const res = await call(auth, { method: 'DELETE' });
    expect(res.headers['set-cookie']).toMatch(/Max-Age=0/);
  });
});

describe('Anmeldung mit Benutzerkonten (Datenbank)', () => {
  let passwordHash;

  beforeEach(async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test');
    vi.stubEnv('APP_PASSWORD', 'einrichtung-123');
    const { hashPassword } = await import('../../utils/server/auth');
    passwordHash ??= await hashPassword('richtig-123');
    fake.current = createFakeDb({
      users: [
        { id: uuid(), username: 'jerry', display_name: 'Jerry', password_hash: passwordHash, role: 'admin', active: true },
        { id: uuid(), username: 'gesperrt', display_name: 'Gesperrt', password_hash: passwordHash, role: 'user', active: false },
      ],
    });
  });

  it('meldet Benutzer an; die Sitzung kennt Rolle und Konto', async () => {
    const { auth, mod } = await loadAuthApi();
    const login = await call(auth, { body: { username: ' Jerry ', password: 'richtig-123' }, ip: uniqueIp() });
    expect(login.statusCode).toBe(200);
    expect(login.body.user).toMatchObject({ username: 'jerry', role: 'admin' });
    expect(login.body.user.password_hash).toBeUndefined();

    const session = await mod.getSession(mockReq({ headers: { cookie: cookieFrom(login) } }));
    expect(session.user).toMatchObject({ username: 'jerry', role: 'admin' });
  });

  it('antwortet bei falschem Passwort, unbekanntem und gesperrtem Benutzer gleich', async () => {
    const { auth } = await loadAuthApi();
    const attempts = [
      { username: 'jerry', password: 'falsch-123' },
      { username: 'niemand', password: 'richtig-123' },
      { username: 'gesperrt', password: 'richtig-123' },
    ];
    for (const body of attempts) {
      const res = await call(auth, { body, ip: uniqueIp() });
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Benutzername oder Passwort falsch.');
    }
  });

  it('ungültig wird die Sitzung, wenn das Konto deaktiviert wird oder das Passwort sich ändert', async () => {
    const { auth, mod } = await loadAuthApi();
    const login = await call(auth, { body: { username: 'jerry', password: 'richtig-123' }, ip: uniqueIp() });
    const request = () => mockReq({ headers: { cookie: cookieFrom(login) } });
    expect((await mod.getSession(request())).authenticated).toBe(true);

    const user = fake.current.state.users.find((u) => u.username === 'jerry');
    user.password_hash = await mod.hashPassword('anders-12345');
    expect((await mod.getSession(request())).authenticated).toBe(false);

    user.password_hash = passwordHash;
    expect((await mod.getSession(request())).authenticated).toBe(true);
    user.active = false;
    expect((await mod.getSession(request())).authenticated).toBe(false);
  });

  it('verlangt für Ersteinrichtung den Einrichtungscode und legt den ersten Administrator an', async () => {
    fake.current = createFakeDb();
    const { setup } = await loadAuthApi();
    const body = { username: 'chef', password: 'langes-passwort', setupCode: 'einrichtung-123' };

    const wrong = await call(setup, { body: { ...body, setupCode: 'falsch' }, ip: uniqueIp() });
    expect(wrong.statusCode).toBe(401);

    const ok = await call(setup, { body, ip: uniqueIp() });
    expect(ok.statusCode).toBe(201);
    expect(ok.body.user.role).toBe('admin');
    expect(ok.headers['set-cookie']).toBeDefined();

    const again = await call(setup, { body, ip: uniqueIp() });
    expect(again.statusCode).toBe(409);
  });

  it('prüft Benutzername und Passwort bei der Ersteinrichtung', async () => {
    fake.current = createFakeDb();
    const { setup } = await loadAuthApi();
    const base = { setupCode: 'einrichtung-123' };
    expect((await call(setup, { body: { ...base, username: 'a', password: 'langes-passwort' }, ip: uniqueIp() })).statusCode).toBe(400);
    expect((await call(setup, { body: { ...base, username: 'chef', password: 'kurz' }, ip: uniqueIp() })).statusCode).toBe(400);
  });

  it('Passwort ändern: nur angemeldet, prüft das aktuelle Passwort, stellt neuen Cookie aus', async () => {
    const { auth, password, mod } = await loadAuthApi();
    const login = await call(auth, { body: { username: 'jerry', password: 'richtig-123' }, ip: uniqueIp() });
    const headers = { cookie: cookieFrom(login) };

    const anonymous = await call(password, { body: {}, ip: uniqueIp() });
    expect(anonymous.statusCode).toBe(401);

    const tooShort = await call(password, { headers, body: { currentPassword: 'richtig-123', newPassword: 'kurz' }, ip: uniqueIp() });
    expect(tooShort.statusCode).toBe(400);

    const wrongCurrent = await call(password, { headers, body: { currentPassword: 'falsch-123', newPassword: 'neues-passwort' }, ip: uniqueIp() });
    expect(wrongCurrent.statusCode).toBe(401);
    expect(fake.current.state.users[0].password_hash).toBe(passwordHash);

    const ok = await call(password, { headers, body: { currentPassword: 'richtig-123', newPassword: 'neues-passwort' }, ip: uniqueIp() });
    expect(ok.statusCode).toBe(200);
    expect(fake.current.state.users[0].password_hash).not.toBe(passwordHash);
    // Der alte Cookie ist nach der Änderung ungültig, der neue gilt
    expect((await mod.getSession(mockReq({ headers }))).authenticated).toBe(false);
    expect((await mod.getSession(mockReq({ headers: { cookie: cookieFrom(ok) } }))).authenticated).toBe(true);
  });
});
