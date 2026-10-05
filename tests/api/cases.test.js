import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, cookieFrom, uniqueIp } from '../helpers/http';
import { createFakeDb, uuid } from '../helpers/fakeDb';

const fake = { current: null };

vi.mock('../../utils/server/supabase', async (importOriginal) => ({
  ...(await importOriginal()),
  db: (...args) => fake.current.db(...args),
}));

let casesApi;
let caseApi;
let authApi;
let hash;
const ids = { admin: uuid(), anna: uuid(), ben: uuid() };
const annasCase = { id: uuid(), type: 'diagnose', vehicle: 'VW Golf', problem: 'ruckelt', created_by_id: ids.anna, created_by: 'Anna', data: { result: { diagnosis: 'x' } } };
const bensCase = { id: uuid(), type: 'obd2', vehicle: 'BMW 3er', code: 'P0171', created_by_id: ids.ben, created_by: 'Ben', data: {} };

async function login(username) {
  const res = await call(authApi, { body: { username, password: 'richtig-123' }, ip: uniqueIp() });
  return { cookie: cookieFrom(res) };
}

beforeEach(async () => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { hashPassword } = await import('../../utils/server/auth');
  hash ??= await hashPassword('richtig-123');
  const user = (id, username, role) => ({ id, username, display_name: username, password_hash: hash, role, active: true });
  fake.current = createFakeDb({
    users: [user(ids.admin, 'chef', 'admin'), user(ids.anna, 'anna', 'user'), user(ids.ben, 'ben', 'user')],
    cases: [{ ...annasCase }, { ...bensCase }],
  });
  casesApi = (await import('../../pages/api/cases/index')).default;
  caseApi = (await import('../../pages/api/cases/[id]')).default;
  authApi = (await import('../../pages/api/auth/index')).default;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Fälle: Zugriff', () => {
  it('antwortet ohne Datenbank mit 503 und ohne Anmeldung mit 401', async () => {
    expect((await call(casesApi, { method: 'GET' })).statusCode).toBe(401);
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const res = await call(casesApi, { method: 'GET' });
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('db_not_configured');
  });
});

describe('Fälle anzeigen', () => {
  it('Mitarbeiter sehen nur eigene Fälle, Administratoren alle', async () => {
    const anna = await call(casesApi, { method: 'GET', headers: await login('anna') });
    expect(anna.body.scope).toBe('own');
    expect(anna.body.cases.map((c) => c.vehicle)).toEqual(['VW Golf']);

    const admin = await call(casesApi, { method: 'GET', headers: await login('chef') });
    expect(admin.body.scope).toBe('all');
    expect(admin.body.cases).toHaveLength(2);
  });
});

describe('Fälle speichern', () => {
  it('trägt Ersteller ein, auch wenn der Client andere Werte schickt', async () => {
    const res = await call(casesApi, {
      headers: await login('anna'),
      body: { type: 'diagnose', vehicle: 'Audi A4', problem: 'x', created_by: 'Chef', created_by_id: ids.admin, carDetails: { make: 'Audi' } },
    });
    expect(res.statusCode).toBe(201);
    const stored = fake.current.state.cases.at(-1);
    expect(stored).toMatchObject({ vehicle: 'Audi A4', created_by: 'anna', created_by_id: ids.anna });
    expect(stored.data.carDetails).toEqual({ make: 'Audi' });
  });

  it('lehnt ungültige Fälle ab', async () => {
    const headers = await login('anna');
    expect((await call(casesApi, { headers, body: { type: 'unbekannt' } })).statusCode).toBe(400);
    expect((await call(casesApi, { headers, body: {} })).statusCode).toBe(400);
  });

  it('übernimmt mehrere Fälle auf einmal (Import)', async () => {
    const res = await call(casesApi, {
      headers: await login('anna'),
      body: { cases: [{ type: 'diagnose' }, { type: 'obd2', code: 'P0300' }, { type: 'ungültig' }] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.cases).toHaveLength(2);
  });
});

describe('Fälle ändern und löschen', () => {
  it('Mitarbeiter können fremde Fälle weder ändern noch löschen (404)', async () => {
    const anna = await login('anna');
    const patch = await call(caseApi, { method: 'PATCH', headers: anna, query: { id: bensCase.id }, body: { note: 'x' } });
    expect(patch.statusCode).toBe(404);
    const del = await call(caseApi, { method: 'DELETE', headers: anna, query: { id: bensCase.id } });
    expect(del.statusCode).toBe(404);
    expect(fake.current.state.cases.find((c) => c.id === bensCase.id)).toBeDefined();
  });

  it('Mitarbeiter ändern und löschen eigene Fälle', async () => {
    const anna = await login('anna');
    const patch = await call(caseApi, { method: 'PATCH', headers: anna, query: { id: annasCase.id }, body: { customer: 'Müller', note: 'Rückruf' } });
    expect(patch.statusCode).toBe(200);
    expect(fake.current.state.cases.find((c) => c.id === annasCase.id)).toMatchObject({ customer: 'Müller', note: 'Rückruf' });
    expect((await call(caseApi, { method: 'DELETE', headers: anna, query: { id: annasCase.id } })).statusCode).toBe(200);
  });

  it('Administratoren dürfen jeden Fall löschen', async () => {
    const res = await call(caseApi, { method: 'DELETE', headers: await login('chef'), query: { id: bensCase.id } });
    expect(res.statusCode).toBe(200);
  });

  it('weist ungültige IDs und leere Änderungen ab', async () => {
    const anna = await login('anna');
    expect((await call(caseApi, { method: 'DELETE', headers: anna, query: { id: '1; drop table cases' } })).statusCode).toBe(400);
    expect((await call(caseApi, { method: 'PATCH', headers: anna, query: { id: annasCase.id }, body: { type: 'obd2' } })).statusCode).toBe(400);
  });

  it('nur Notiz und Kunde sind änderbar', async () => {
    await call(caseApi, { method: 'PATCH', headers: await login('anna'), query: { id: annasCase.id }, body: { note: 'ok', type: 'obd2', created_by_id: ids.admin } });
    expect(fake.current.state.cases.find((c) => c.id === annasCase.id)).toMatchObject({ note: 'ok', type: 'diagnose', created_by_id: ids.anna });
  });
});

describe('Fahrzeughistorie (?vin=)', () => {
  const VIN = 'WVWZZZ1KZ6W612345';

  beforeEach(() => {
    fake.current.state.cases.push(
      { id: uuid(), type: 'diagnose', vin: VIN, vehicle: 'VW Golf', created_by_id: ids.anna, created_at: '2026-02-01T10:00:00Z', data: {} },
      { id: uuid(), type: 'obd2', vin: VIN, code: 'P0171', vehicle: 'VW Golf', created_by_id: ids.ben, created_at: '2026-03-01T10:00:00Z', data: {} },
      { id: uuid(), type: 'obd2', vin: 'WBAVA31010NL12345', vehicle: 'BMW', created_by_id: ids.anna, created_at: '2026-04-01T10:00:00Z', data: {} },
    );
  });

  it('Administratoren sehen alle Fälle des Fahrzeugs, neueste zuerst', async () => {
    const res = await call(casesApi, { method: 'GET', headers: await login('chef'), query: { vin: VIN } });
    expect(res.statusCode).toBe(200);
    expect(res.body.scope).toBe('all');
    expect(res.body.cases.map((c) => c.code || c.type)).toEqual(['P0171', 'diagnose']);
  });

  it('Mitarbeiter sehen auch hier nur eigene Fälle', async () => {
    const res = await call(casesApi, { method: 'GET', headers: await login('anna'), query: { vin: VIN } });
    expect(res.body.scope).toBe('own');
    expect(res.body.cases).toHaveLength(1);
    expect(res.body.cases[0].createdAt).toBe('2026-02-01T10:00:00Z');
  });

  it('bereinigt die VIN und lehnt ungültige Werte ab, bevor die Datenbank gefragt wird', async () => {
    const headers = await login('chef');
    const ok = await call(casesApi, { method: 'GET', headers, query: { vin: ' wvwzzz-1kz6w612345 ' } });
    expect(ok.body.cases).toHaveLength(2);

    const before = fake.current.state.calls.length;
    for (const vin of ['', 'ABC', `${VIN}&select=password_hash`, "WVWZZZ1KZ6W61234'; drop", 'WVWZZZ1KZ6W6I2345']) {
      expect((await call(casesApi, { method: 'GET', headers, query: { vin } })).statusCode).toBe(400);
    }
    expect(fake.current.state.calls.slice(before).every((c) => !c.path.startsWith('cases'))).toBe(true);
  });

  it('speichert die VIN beim Anlegen einheitlich', async () => {
    await call(casesApi, { headers: await login('anna'), body: { type: 'diagnose', vin: ' wvw-zzz1kz6w612345 ' } });
    expect(fake.current.state.cases.at(-1).vin).toBe(VIN);
  });
});
