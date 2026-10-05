import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, cookieFrom, uniqueIp } from '../helpers/http';
import { createFakeDb, uuid } from '../helpers/fakeDb';

const fake = { current: null };

vi.mock('../../utils/server/supabase', async (importOriginal) => ({
  ...(await importOriginal()),
  db: (...args) => fake.current.db(...args),
}));

let usersApi;
let userApi;
let authApi;
let hash;
const ids = { admin: uuid(), worker: uuid() };

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
  fake.current = createFakeDb({
    users: [
      { id: ids.admin, username: 'chef', display_name: 'Chef', password_hash: hash, role: 'admin', active: true },
      { id: ids.worker, username: 'monteur', display_name: 'Monteur', password_hash: hash, role: 'user', active: true },
    ],
  });
  usersApi = (await import('../../pages/api/users/index')).default;
  userApi = (await import('../../pages/api/users/[id]')).default;
  authApi = (await import('../../pages/api/auth/index')).default;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Benutzerverwaltung: Zugriff', () => {
  it('verlangt Anmeldung (401) und Administratorrolle (403)', async () => {
    expect((await call(usersApi, { method: 'GET' })).statusCode).toBe(401);
    const worker = await login('monteur');
    expect((await call(usersApi, { method: 'GET', headers: worker })).statusCode).toBe(403);
    expect((await call(userApi, { method: 'DELETE', headers: worker, query: { id: ids.admin } })).statusCode).toBe(403);
    expect(fake.current.state.users).toHaveLength(2);
  });

  it('Administrator sieht alle Konten, ohne Passwort-Hash', async () => {
    const admin = await login('chef');
    const res = await call(usersApi, { method: 'GET', headers: admin });
    expect(res.statusCode).toBe(200);
    expect(res.body.users.map((u) => u.username)).toEqual(['chef', 'monteur']);
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash|scrypt|s1\$/);
  });
});

describe('Benutzer anlegen', () => {
  const create = async (body) => call(usersApi, { headers: await login('chef'), body });

  it('legt Konten an, Rolle nur "admin" oder sonst "user", Name wird normalisiert', async () => {
    const res = await create({ username: ' Neu.Kollege ', password: 'langes-passwort', role: 'hacker' });
    expect(res.statusCode).toBe(201);
    expect(res.body.user).toMatchObject({ username: 'neu.kollege', role: 'user' });
    const stored = fake.current.state.users.find((u) => u.username === 'neu.kollege');
    expect(stored.password_hash).toMatch(/^s1\$/);
    expect(stored.password_hash).not.toContain('langes-passwort');
  });

  it('prüft Benutzername, Passwort und Duplikate', async () => {
    expect((await create({ username: 'a', password: 'langes-passwort' })).statusCode).toBe(400);
    expect((await create({ username: 'neuer', password: 'kurz' })).statusCode).toBe(400);
    expect((await create({ username: 'monteur', password: 'langes-passwort' })).statusCode).toBe(409);
  });
});

describe('Benutzer ändern und löschen', () => {
  const patch = async (id, body, who = 'chef') => call(userApi, { method: 'PATCH', headers: await login(who), query: { id }, body });

  it('ändert Rolle, Anzeigename und sperrt Konten', async () => {
    const res = await patch(ids.worker, { role: 'admin', displayName: ' Meister ', active: false });
    expect(res.statusCode).toBe(200);
    expect(fake.current.state.users[1]).toMatchObject({ role: 'admin', display_name: 'Meister', active: false });
  });

  it('schützt das eigene Konto vor Sperren, Herabstufen und Löschen', async () => {
    expect((await patch(ids.admin, { active: false })).statusCode).toBe(400);
    expect((await patch(ids.admin, { role: 'user' })).statusCode).toBe(400);
    const del = await call(userApi, { method: 'DELETE', headers: await login('chef'), query: { id: ids.admin } });
    expect(del.statusCode).toBe(400);
    expect(fake.current.state.users.find((u) => u.id === ids.admin)).toMatchObject({ role: 'admin', active: true });
  });

  it('löscht andere Konten; ungültige und unbekannte IDs werden abgewiesen', async () => {
    const admin = await login('chef');
    expect((await call(userApi, { method: 'DELETE', headers: admin, query: { id: 'kein-uuid' } })).statusCode).toBe(400);
    expect((await call(userApi, { method: 'DELETE', headers: admin, query: { id: uuid() } })).statusCode).toBe(404);
    expect((await call(userApi, { method: 'DELETE', headers: admin, query: { id: ids.worker } })).statusCode).toBe(200);
    expect(fake.current.state.users.map((u) => u.username)).toEqual(['chef']);
  });

  it('setzt ein neues Passwort (gehasht) und lehnt zu kurze ab', async () => {
    expect((await patch(ids.worker, { password: 'kurz' })).statusCode).toBe(400);
    expect((await patch(ids.worker, { password: 'neues-passwort-123' })).statusCode).toBe(200);
    expect(fake.current.state.users[1].password_hash).not.toBe(hash);
  });

  it('meldet "keine Änderungen"', async () => {
    expect((await patch(ids.worker, {})).statusCode).toBe(400);
  });
});
