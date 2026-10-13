import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, cookieFrom, uniqueIp } from '../helpers/http';
import { createFakeDb, uuid } from '../helpers/fakeDb';

const fake = { current: null };

vi.mock('../../utils/server/supabase', async (importOriginal) => ({
  ...(await importOriginal()),
  db: (...args) => fake.current.db(...args),
}));

let vehiclesApi;
let vehicleApi;
let authApi;
let hash;
const ids = { admin: uuid(), anna: uuid(), ben: uuid() };
const VIN = 'WBAFR9C50BC123456';
const VIN2 = 'WVWZZZ1KZ6W000001';
const annas = { id: uuid(), vin: VIN, make: 'BMW', model: '5er', created_by_id: ids.anna, created_by: 'Anna', data: {}, created_at: '2026-01-01T00:00:00Z' };
const bens = { id: uuid(), vin: VIN2, make: 'VW', model: 'Golf', created_by_id: ids.ben, created_by: 'Ben', data: {}, created_at: '2026-01-02T00:00:00Z' };

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
    vehicles: [{ ...annas }, { ...bens }],
  });
  vehiclesApi = (await import('../../pages/api/vehicles/index')).default;
  vehicleApi = (await import('../../pages/api/vehicles/[id]')).default;
  authApi = (await import('../../pages/api/auth/index')).default;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Fahrzeuge: Zugriff', () => {
  it('antwortet ohne Anmeldung mit 401 und ohne Datenbank mit 503', async () => {
    expect((await call(vehiclesApi, { method: 'GET' })).statusCode).toBe(401);
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const res = await call(vehiclesApi, { method: 'GET' });
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('db_not_configured');
  });
});

describe('Fahrzeuge abrufen', () => {
  it('Mitarbeiter sehen nur eigene Fahrzeuge, Administratoren alle', async () => {
    const anna = await call(vehiclesApi, { method: 'GET', headers: await login('anna') });
    expect(anna.body.scope).toBe('own');
    expect(anna.body.vehicles.map((v) => v.model)).toEqual(['5er']);

    const admin = await call(vehiclesApi, { method: 'GET', headers: await login('chef') });
    expect(admin.body.scope).toBe('all');
    expect(admin.body.vehicles).toHaveLength(2);
  });

  it('findet Fahrzeuge per VIN (mit Normalisierung) und lehnt ungültige VINs ab', async () => {
    const anna = await login('anna');
    const hit = await call(vehiclesApi, { method: 'GET', headers: anna, query: { vin: 'wbafr9c5-0bc 123456' } });
    expect(hit.body.vehicles.map((v) => v.vin)).toEqual([VIN]);
    const foreign = await call(vehiclesApi, { method: 'GET', headers: anna, query: { vin: VIN2 } });
    expect(foreign.body.vehicles).toEqual([]);
    expect((await call(vehiclesApi, { method: 'GET', headers: anna, query: { vin: 'kurz' } })).statusCode).toBe(400);
  });
});

describe('Fahrzeuge speichern', () => {
  it('legt ein Fahrzeug mit normalisierter VIN und Ersteller an', async () => {
    const anna = await login('anna');
    const res = await call(vehiclesApi, {
      headers: anna,
      body: {
        vin: ' wvwzzz1kz6w-000002 ',
        make: 'VW',
        model: 'Passat',
        year: 2019,
        licensePlate: 'b-ab 123',
        customer: 'Meier',
        registration: { hsn: '0603', tsn: 'BKW' },
        createdBy: 'Fälscher',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.vehicle).toMatchObject({
      vin: 'WVWZZZ1KZ6W000002',
      year: '2019',
      licensePlate: 'B-AB 123',
      customer: 'Meier',
      createdBy: 'anna',
      registration: { hsn: '0603', tsn: 'BKW' },
    });
    expect(fake.current.state.vehicles.at(-1).created_by_id).toBe(ids.anna);
  });

  it('aktualisiert den eigenen Eintrag zur selben VIN statt ein Duplikat anzulegen', async () => {
    const anna = await login('anna');
    const res = await call(vehiclesApi, { headers: anna, body: { vin: VIN, make: 'BMW', model: '530d', customer: 'Schulz' } });
    expect(res.statusCode).toBe(200);
    expect(res.body.created).toBe(false);
    expect(res.body.vehicle).toMatchObject({ id: annas.id, model: '530d', customer: 'Schulz' });
    expect(fake.current.state.vehicles.filter((v) => v.vin === VIN)).toHaveLength(1);
  });

  it('legt für dieselbe VIN eines anderen Benutzers einen eigenen Eintrag an', async () => {
    const ben = await login('ben');
    const res = await call(vehiclesApi, { headers: ben, body: { vin: VIN, make: 'BMW' } });
    expect(res.statusCode).toBe(201);
    expect(annas.created_by_id).toBe(ids.anna);
    expect(fake.current.state.vehicles.filter((v) => v.vin === VIN)).toHaveLength(2);
  });

  it('lehnt ungültige VINs und zu große Fahrzeugscheindaten ab', async () => {
    const anna = await login('anna');
    expect((await call(vehiclesApi, { headers: anna, body: { vin: 'ZU-KURZ' } })).statusCode).toBe(400);
    expect((await call(vehiclesApi, { headers: anna, body: { vin: 'WBAFR9C50BC12345I' } })).statusCode).toBe(400); // I ist in VINs nicht erlaubt
    expect((await call(vehiclesApi, { headers: anna, body: { vin: VIN2, registration: { x: 'a'.repeat(60 * 1024) } } })).statusCode).toBe(400);
  });
});

describe('Fahrzeug ändern und löschen', () => {
  it('ändert nur Textfelder, nie die VIN, und nur eigene Fahrzeuge', async () => {
    const anna = await login('anna');
    const ok = await call(vehicleApi, { method: 'PATCH', headers: anna, query: { id: annas.id }, body: { customer: 'Neu', licensePlate: 'm-xy 1', vin: VIN2 } });
    expect(ok.statusCode).toBe(200);
    expect(ok.body.vehicle).toMatchObject({ customer: 'Neu', licensePlate: 'M-XY 1', vin: VIN });
    expect((await call(vehicleApi, { method: 'PATCH', headers: anna, query: { id: bens.id }, body: { customer: 'x' } })).statusCode).toBe(404);
    expect((await call(vehicleApi, { method: 'PATCH', headers: anna, query: { id: annas.id }, body: {} })).statusCode).toBe(400);
  });

  it('löscht eigene Fahrzeuge; Administratoren dürfen alle löschen', async () => {
    const anna = await login('anna');
    expect((await call(vehicleApi, { method: 'DELETE', headers: anna, query: { id: bens.id } })).statusCode).toBe(404);
    expect((await call(vehicleApi, { method: 'DELETE', headers: anna, query: { id: annas.id } })).statusCode).toBe(200);
    const admin = await login('chef');
    expect((await call(vehicleApi, { method: 'DELETE', headers: admin, query: { id: bens.id } })).statusCode).toBe(200);
    expect(fake.current.state.vehicles).toHaveLength(0);
    expect((await call(vehicleApi, { method: 'DELETE', headers: admin, query: { id: 'x; drop table vehicles' } })).statusCode).toBe(400);
  });
});
