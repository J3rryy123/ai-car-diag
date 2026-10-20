import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, uniqueIp } from '../helpers/http';

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), db: vi.fn() }));
vi.mock('../../utils/server/auth', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('../../utils/server/supabase', async (importOriginal) => ({ ...(await importOriginal()), db: mocks.db }));

let handler;
let kba;
const VW = { manufacturer: 'VOLKSWAGEN-VW', trade_name: 'BEETLE', stand: '2024-01-01' };

beforeEach(async () => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.requireAuth.mockReset().mockResolvedValue({ mode: 'users', authenticated: true, user: { id: `u-${Math.random()}`, role: 'user' } });
  mocks.db.mockReset().mockImplementation(async (path) => {
    if (path.startsWith('rpc/')) return 1;
    if (path.includes('hsn=eq.0603') && path.includes('tsn=eq.BKW')) return [VW];
    if (path.includes('hsn=eq.0603') && !path.includes('tsn=')) return [{ manufacturer: VW.manufacturer, stand: VW.stand }];
    return [];
  });
  handler ??= (await import('../../pages/api/kba')).default;
  kba ??= await import('../../utils/server/kba');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const get = (query) => call(handler, { method: 'GET', query, ip: uniqueIp() });

describe('KBA-Schlüsselverzeichnis: Schnittstelle', () => {
  it('liefert Hersteller und Handelsname zu HSN + TSN', async () => {
    const res = await get({ hsn: '0603', tsn: 'bkw' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ found: true, manufacturer: 'VOLKSWAGEN-VW', make: 'VW', tradeName: 'BEETLE', model: 'BEETLE', tsnFound: true, stand: '2024-01-01' });
  });

  it('liefert bei unbekannter TSN nur den Hersteller aus der HSN', async () => {
    const res = await get({ hsn: '0603', tsn: 'ZZZ' });
    expect(res.body).toMatchObject({ found: true, make: 'VW', tsnFound: false, tsn: null, tradeName: '', model: '' });
  });

  it('liefert found:false für unbekannte HSN', async () => {
    expect((await get({ hsn: '9999' })).body).toEqual({ found: false });
  });

  it('prüft die Eingaben, bevor die Datenbank gefragt wird', async () => {
    for (const query of [{}, { hsn: '06' }, { hsn: '0603', tsn: 'AB' }, { hsn: '0603; drop table x' }]) {
      expect((await get(query)).statusCode).toBe(400);
    }
    expect(mocks.db).not.toHaveBeenCalledWith(expect.stringContaining('kba_types'));
  });

  it('verlangt Anmeldung und eine konfigurierte Datenbank, erlaubt nur GET', async () => {
    mocks.requireAuth.mockImplementationOnce(async (req, res) => {
      res.status(401).json({ code: 'unauthorized' });
      return null;
    });
    expect((await get({ hsn: '0603' })).statusCode).toBe(401);
    expect((await call(handler, { method: 'POST', ip: uniqueIp() })).statusCode).toBe(405);
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const res = await get({ hsn: '0603' });
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('db_not_configured');
  });

  it('meldet Datenbankfehler als 502', async () => {
    mocks.db.mockImplementation(async (path) => {
      if (path.startsWith('kba_types')) throw new Error('unreachable');
      return 1;
    });
    expect((await get({ hsn: '0603', tsn: 'BKW' })).statusCode).toBe(502);
  });
});

describe('Herstellernamen aufbereiten', () => {
  it('bringt KBA-Klartext in übliche Markenschreibweise', () => {
    const cases = {
      'VOLKSWAGEN-VW': 'VW',
      'BAYER.MOT.WERKE-BMW': 'BMW',
      'DAIMLER (D)': 'Mercedes-Benz',
      'MERCEDES-BENZ': 'Mercedes-Benz',
      'FORD (D)': 'Ford',
      'SKODA (CZ)': 'Skoda',
      'OPEL AUTOMOBILE': 'Opel',
      'KIA MOTORS (SK)': 'Kia',
      'TOYOTA EUROPE (B)': 'Toyota',
      'RENAULT (F)': 'Renault',
      AUDI: 'Audi',
      '': '',
    };
    for (const [input, expected] of Object.entries(cases)) expect(kba.displayMake(input)).toBe(expected);
  });

  it('übernimmt als Modell nur eindeutige Einzelbezeichnungen', () => {
    expect(kba.singleModel('BEETLE')).toBe('BEETLE');
    expect(kba.singleModel('LT 35 Z;LT 40;LT 46')).toBe('');
    expect(kba.singleModel('K 100,RT,LT')).toBe('');
    expect(kba.singleModel('UNBEKANNT')).toBe('');
  });
});
