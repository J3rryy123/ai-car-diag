import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mapVpicResult } from '../utils/server/vinLookup';

describe('mapVpicResult', () => {
  it('wandelt eine vPIC-Zeile um (hp → PS, Kraftstoff deutsch)', () => {
    const result = mapVpicResult({
      Model: 'Accord',
      Trim: 'EX',
      ModelYear: '2003',
      DisplacementL: '2.3',
      EngineCylinders: '4',
      EngineHP: '160',
      FuelTypePrimary: 'Gasoline',
      BodyClass: 'Sedan/Saloon',
    });
    expect(result.model.series).toBe('Accord EX');
    expect(result.engine).toMatchObject({ displacement: '2.3L', fuelType: 'Benzin', power: '162 PS', cylinders: 4 });
    expect(result.modelYear).toBe(2003);
    expect(result.source).toBe('NHTSA vPIC');
  });

  it('erkennt Hybrid und Elektro', () => {
    expect(mapVpicResult({ Model: 'X', FuelTypePrimary: 'Gasoline', ElectrificationLevel: 'PHEV (Plug-in Hybrid Electric Vehicle)' }).engine.fuelType).toBe('Hybrid');
    expect(mapVpicResult({ Model: 'i3', FuelTypePrimary: 'Electric', ElectrificationLevel: 'BEV (Battery Electric Vehicle)' }).engine.fuelType).toBe('Elektro');
  });

  it('bringt den Hersteller in normale Schreibweise', () => {
    const make = (Make) => mapVpicResult({ Make }).make;
    expect(make('VOLKSWAGEN')).toBe('Volkswagen');
    expect(make('MERCEDES-BENZ')).toBe('Mercedes-Benz');
    expect(make('LAND ROVER')).toBe('Land Rover');
    expect(make('BMW')).toBe('BMW');
    expect(make('MINI')).toBe('MINI');
  });

  it('liefert bei nur bekanntem Hersteller kein Modell und keinen Motor', () => {
    const result = mapVpicResult({ Make: 'BMW', Model: '', ErrorCode: '7' });
    expect(result).toMatchObject({ make: 'BMW', model: null, engine: null });
  });

  it('liefert null, wenn die Datenbank nichts Brauchbares kennt', () => {
    expect(mapVpicResult({ Model: '', ErrorCode: '7' })).toBeNull();
    expect(mapVpicResult({ Model: 'Not Applicable' })).toBeNull();
    expect(mapVpicResult(null)).toBeNull();
  });
});

describe('lookupVin caching', () => {
  const VIN = '1HGCM82633A004352';
  const VPIC_ROW = { Make: 'HONDA', Model: 'Accord', ModelYear: '2003', FuelTypePrimary: 'Gasoline' };
  let dbMock;
  let fetchMock;
  let configured;

  // Fresh module per test: the in-memory cache and the "table missing" flag live at module level
  const load = async () => {
    vi.resetModules();
    vi.doMock('../utils/server/supabase', () => ({ db: dbMock, dbConfigured: () => configured }));
    return (await import('../utils/server/vinLookup')).lookupVin;
  };

  beforeEach(() => {
    configured = true;
    dbMock = vi.fn().mockResolvedValue([]);
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ Results: [VPIC_ROW] }) });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.doUnmock('../utils/server/supabase');
  });

  it('answers from the persistent cache without calling vPIC', async () => {
    const stored = { make: 'Honda', model: { series: 'Accord' }, source: 'NHTSA vPIC' };
    dbMock.mockResolvedValueOnce([{ found: true, data: stored, fetched_at: new Date().toISOString() }]);
    const lookupVin = await load();

    expect(await lookupVin(VIN)).toEqual({ found: true, data: stored });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(dbMock).toHaveBeenCalledTimes(1);
  });

  it('fetches from vPIC on a cache miss, stores the result and then serves it from memory', async () => {
    const lookupVin = await load();

    const first = await lookupVin(VIN);
    expect(first.found).toBe(true);
    expect(first.data.model.series).toBe('Accord');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const write = dbMock.mock.calls.find(([path]) => path.startsWith('vin_cache?on_conflict=vin'));
    expect(write[1].method).toBe('POST');
    expect(write[1].prefer).toContain('merge-duplicates');
    expect(write[1].body).toMatchObject({ vin: VIN, found: true, source: 'NHTSA vPIC' });

    expect(await lookupVin(VIN)).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dbMock).toHaveBeenCalledTimes(2); // one read, one write - nothing for the second call
  });

  it('refetches when the stored row has expired', async () => {
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    dbMock.mockResolvedValueOnce([{ found: true, data: { make: 'Old' }, fetched_at: old }]);
    const lookupVin = await load();

    const result = await lookupVin(VIN);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.data.make).toBe('Honda');
  });

  it('expires "not found" rows sooner than found rows', async () => {
    const eightDays = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    dbMock.mockResolvedValueOnce([{ found: false, data: null, fetched_at: eightDays }]);
    const lookupVin = await load();

    await lookupVin(VIN);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves a recent "not found" row without asking vPIC again', async () => {
    dbMock.mockResolvedValueOnce([{ found: false, data: null, fetched_at: new Date().toISOString() }]);
    const lookupVin = await load();

    expect(await lookupVin(VIN)).toEqual({ found: false, data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stores "not found" results too', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ Results: [{ Model: '' }] }) });
    const lookupVin = await load();

    expect(await lookupVin(VIN)).toEqual({ found: false, data: null });
    const write = dbMock.mock.calls.find(([path]) => path.startsWith('vin_cache?on_conflict=vin'));
    expect(write[1].body).toMatchObject({ vin: VIN, found: false, data: null });
  });

  it('still works when the cache read fails', async () => {
    dbMock.mockRejectedValue(Object.assign(new Error('unreachable'), { code: undefined }));
    const lookupVin = await load();

    const result = await lookupVin(VIN);
    expect(result.found).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('disables the persistent cache once when the table is missing', async () => {
    dbMock.mockRejectedValue(Object.assign(new Error('missing'), { code: 'PGRST205' }));
    const lookupVin = await load();

    await lookupVin(VIN);
    await lookupVin('WBA3A5C51CF256651');
    expect(dbMock).toHaveBeenCalledTimes(1); // only the first read; no write, no further reads
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not touch the database when it is not configured', async () => {
    configured = false;
    const lookupVin = await load();

    expect((await lookupVin(VIN)).found).toBe(true);
    expect(dbMock).not.toHaveBeenCalled();
  });

  it('does not cache upstream errors', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    const lookupVin = await load();

    await expect(lookupVin(VIN)).rejects.toThrow(/503/);
    expect(dbMock.mock.calls.some(([path]) => path.startsWith('vin_cache?on_conflict'))).toBe(false);

    expect((await lookupVin(VIN)).found).toBe(true);
  });
});
