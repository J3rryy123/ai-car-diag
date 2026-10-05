import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from '../utils/server/rateLimit';

// Simuliert die Datenbankfunktion rate_limit_hit: zählt je Schlüssel hoch
function mockDb({ failWith } = {}) {
  const counts = new Map();
  const calls = [];
  const fetchMock = vi.fn(async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    if (failWith) return new Response(JSON.stringify({ code: failWith, message: 'boom' }), { status: 404 });
    const key = JSON.parse(options.body).p_key;
    counts.set(key, (counts.get(key) || 0) + 1);
    return new Response(String(counts.get(key)), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('createRateLimiter ohne Datenbank', () => {
  it('nutzt den Zähler im Arbeitsspeicher', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const limited = createRateLimiter('t', 60_000, 2);
    expect([await limited('a'), await limited('a'), await limited('a')]).toEqual([false, false, true]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('createRateLimiter mit Datenbank', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test');
  });

  it('zählt zentral, getrennt nach Name und Schlüssel, und sperrt über dem Limit', async () => {
    const { calls } = mockDb();
    const scan = createRateLimiter('scan', 60_000, 2);
    const vin = createRateLimiter('vin', 60_000, 2);
    expect([await scan('u1'), await scan('u1'), await scan('u1')]).toEqual([false, false, true]);
    expect(await scan('u2')).toBe(false);
    expect(await vin('u1')).toBe(false);
    expect(calls[0].url).toBe('https://example.supabase.co/rest/v1/rpc/rate_limit_hit');
    expect(calls[0].body).toEqual({ p_key: 'scan:u1', p_window_seconds: 60 });
    expect(calls.at(-1).body.p_key).toBe('vin:u1');
  });

  it('fällt bei fehlender Funktion auf den Arbeitsspeicher zurück und fragt nicht bei jeder Anfrage erneut', async () => {
    const { calls } = mockDb({ failWith: 'PGRST202' });
    const limited = createRateLimiter('t', 60_000, 1);
    expect(await limited('a')).toBe(false);
    expect(await limited('a')).toBe(true); // Zähler im Speicher greift weiter
    expect(calls).toHaveLength(1); // Datenbank wurde nur einmal versucht
  });

  it('versucht die Datenbank nach einer Minute erneut', async () => {
    vi.useFakeTimers();
    const { calls } = mockDb({ failWith: 'PGRST202' });
    const limited = createRateLimiter('t', 1_000, 5);
    await limited('a');
    await limited('a');
    expect(calls).toHaveLength(1);
    vi.setSystemTime(Date.now() + 61_000);
    await limited('a');
    expect(calls).toHaveLength(2);
  });

  it('sperrt nicht fälschlich bei unerwarteter Antwort', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ x: 1 }), { status: 200, headers: { 'content-type': 'application/json' } })));
    const limited = createRateLimiter('t', 60_000, 3);
    expect(await limited('a')).toBe(false);
  });
});
