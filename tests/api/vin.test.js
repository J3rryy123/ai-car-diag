import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, uniqueIp } from '../helpers/http';

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), lookupVin: vi.fn() }));
vi.mock('../../utils/server/auth', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('../../utils/server/vinLookup', () => ({ lookupVin: mocks.lookupVin }));

let handler;
let userSeq = 0;
const VIN = '1HGCM82633A004352';

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  // Je Test ein eigener Benutzer, damit die Anfragebegrenzung nicht zwischen Tests wirkt
  mocks.requireAuth.mockReset().mockResolvedValue({ mode: 'users', authenticated: true, user: { id: `u-${++userSeq}`, role: 'user' } });
  mocks.lookupVin.mockReset().mockResolvedValue({ found: true, data: { model: { series: 'Accord EX' }, source: 'NHTSA vPIC' } });
  handler ??= (await import('../../pages/api/vin')).default;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('/api/vin', () => {
  it('erlaubt nur POST und verlangt Anmeldung', async () => {
    expect((await call(handler, { method: 'GET' })).statusCode).toBe(405);
    mocks.requireAuth.mockImplementation(async (req, res) => {
      res.status(401).json({});
      return null;
    });
    expect((await call(handler, { body: { vin: VIN }, ip: uniqueIp() })).statusCode).toBe(401);
    expect(mocks.lookupVin).not.toHaveBeenCalled();
  });

  it('weist ungültige VINs ab, ohne die Datenbank zu fragen', async () => {
    for (const vin of [undefined, '', 'ABC', '1HGCM82633A00435I', 123]) {
      expect((await call(handler, { body: { vin }, ip: uniqueIp() })).statusCode).toBe(400);
    }
    expect(mocks.lookupVin).not.toHaveBeenCalled();
  });

  it('bereinigt die VIN und liefert die Datenbankwerte', async () => {
    const res = await call(handler, { body: { vin: ' 1hgcm 8263-3a004352 ' }, ip: uniqueIp() });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ found: true, data: { model: { series: 'Accord EX' }, source: 'NHTSA vPIC' } });
    expect(mocks.lookupVin).toHaveBeenCalledWith(VIN);
  });

  it('meldet "nicht gefunden" ohne Fehler', async () => {
    mocks.lookupVin.mockResolvedValueOnce({ found: false, data: null });
    const res = await call(handler, { body: { vin: VIN }, ip: uniqueIp() });
    expect(res.body).toEqual({ found: false, data: null });
  });

  it('antwortet bei Datenbankausfall mit 502', async () => {
    mocks.lookupVin.mockRejectedValueOnce(new Error('vPIC HTTP 503'));
    const res = await call(handler, { body: { vin: VIN }, ip: uniqueIp() });
    expect(res.statusCode).toBe(502);
    expect(res.body.message).toMatch(/nicht erreichbar/);
  });

  it('erlaubt 30 Abfragen pro Minute je Benutzer', async () => {
    mocks.requireAuth.mockResolvedValue({ mode: 'users', authenticated: true, user: { id: 'vin-limit', role: 'user' } });
    const codes = [];
    for (let i = 0; i < 32; i++) codes.push((await call(handler, { body: { vin: VIN } })).statusCode);
    expect(codes.slice(0, 30).every((c) => c === 200)).toBe(true);
    expect(codes.slice(30)).toEqual([429, 429]);
  });
});
