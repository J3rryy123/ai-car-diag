import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, uniqueIp } from '../helpers/http';
import { createFakeDb, uuid } from '../helpers/fakeDb';

const fake = { current: null };
const mocks = vi.hoisted(() => ({ callClaude: vi.fn() }));

vi.mock('../../utils/server/supabase', async (importOriginal) => ({
  ...(await importOriginal()),
  db: (...args) => fake.current.db(...args),
}));
vi.mock('../../utils/server/claude', () => ({ callClaude: mocks.callClaude }));

const answer = { toolInput: { diagnosis: 'Zündspule prüfen', confidence: 80, possibleCauses: [], nextSteps: ['a'], urgency: 'Mittel' }, content: '', model: 'm' };
const body = { problem: 'Motor ruckelt', carDetails: { make: 'VW', model: 'Golf', year: '2006' } };

let api;
let subscriberId;
let cookie;
const asUser = (id) => ({ cookie: api.auth.sessionCookie(fake.current.state.users.find((u) => u.id === id)).split(';')[0] });
const analyze = (headers = { cookie }) => call(api.analyze, { body, headers, ip: uniqueIp() });

beforeEach(async () => {
  vi.resetModules();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test');
  vi.stubEnv('CLAUDE_API_KEY', 'test-key');
  vi.stubEnv('MONTHLY_ANALYSIS_LIMIT', '3');
  mocks.callClaude.mockReset().mockResolvedValue(answer);

  api = {
    auth: await import('../../utils/server/auth'),
    analyze: (await import('../../pages/api/analyze')).default,
    authApi: (await import('../../pages/api/auth/index')).default,
    quota: await import('../../utils/server/quota'),
  };
  const hash = await api.auth.hashPassword('langes-passwort');
  subscriberId = uuid();
  const staffId = uuid();
  fake.current = createFakeDb({
    users: [
      { id: subscriberId, username: 'kunde', password_hash: hash, role: 'user', active: true, account_type: 'subscriber', subscription_status: 'active' },
      { id: staffId, username: 'mitarbeiter', password_hash: hash, role: 'user', active: true },
    ],
  });
  cookie = asUser(subscriberId).cookie;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Monatsgrenze für Abo-Konten', () => {
  it('erlaubt Anfragen bis zum Limit, danach 429 ohne weiteren KI-Aufruf', async () => {
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await analyze()).statusCode);
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    expect(mocks.callClaude).toHaveBeenCalledTimes(3);

    const blocked = await analyze();
    expect(blocked.body.code).toBe('quota_exceeded');
    expect(blocked.body.message).toMatch(/3 KI-Anfragen/);
  });

  it('zählt je Kalendermonat; im neuen Monat beginnt der Zähler bei 0', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-29T12:00:00Z') });
    cookie = asUser(subscriberId).cookie; // Anmeldung gilt 7 Tage ab der (simulierten) Ausstellung
    for (let i = 0; i < 3; i++) await analyze();
    expect((await analyze()).statusCode).toBe(429);
    vi.setSystemTime(new Date('2026-11-01T00:00:01Z'));
    expect((await analyze()).statusCode).toBe(200);
    vi.useRealTimers();
  });

  it('gibt die Anfrage zurück, wenn die KI ausfällt (Demo-Ergebnis)', async () => {
    mocks.callClaude.mockRejectedValue(new Error('overloaded'));
    for (let i = 0; i < 5; i++) expect((await analyze()).statusCode).toBe(200);
    expect(fake.current.state.usage.get(`${subscriberId}:${api.quota.currentPeriod()}`)).toBe(0);
  });

  it('begrenzt Mitarbeiter nicht', async () => {
    const staff = fake.current.state.users.find((u) => u.username === 'mitarbeiter');
    for (let i = 0; i < 5; i++) expect((await analyze(asUser(staff.id))).statusCode).toBe(200);
  });

  it('ist ohne MONTHLY_ANALYSIS_LIMIT unbegrenzt und fragt die Datenbank nicht', async () => {
    vi.stubEnv('MONTHLY_ANALYSIS_LIMIT', '');
    for (let i = 0; i < 5; i++) expect((await analyze()).statusCode).toBe(200);
    expect(fake.current.state.calls.some((c) => c.path === 'rpc/usage_add')).toBe(false);
  });

  it('lässt Anfragen zu, wenn die Zählerfunktion fehlt (Schema nicht eingespielt)', async () => {
    const original = fake.current.db;
    fake.current.db = async (path, ...rest) => {
      if (path === 'rpc/usage_add') throw Object.assign(new Error('missing'), { code: 'PGRST202' });
      return original(path, ...rest);
    };
    expect((await analyze()).statusCode).toBe(200);
  });

  it('zeigt den Verbrauch in /api/auth', async () => {
    await analyze();
    await analyze();
    const state = await call(api.authApi, { method: 'GET', headers: { cookie } });
    expect(state.body.usage).toMatchObject({ used: 2, limit: 3 });
    expect(state.body.usage.resetsAt).toMatch(/-01T00:00:00/);

    const staff = fake.current.state.users.find((u) => u.username === 'mitarbeiter');
    expect((await call(api.authApi, { method: 'GET', headers: asUser(staff.id) })).body.usage).toBeNull();
  });
});
