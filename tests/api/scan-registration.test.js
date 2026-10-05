import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, uniqueIp } from '../helpers/http';

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), callClaude: vi.fn() }));
vi.mock('../../utils/server/auth', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('../../utils/server/claude', () => ({ callClaude: mocks.callClaude }));

let handler;
let userSeq = 0;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const GOLF = {
  isRegistrationDocument: true,
  vin: 'wvw zzz 1kz6w612345',
  hsn: '0603',
  tsn: 'azq',
  make: 'VOLKSWAGEN',
  model: 'GOLF V',
  firstRegistration: '15.03.2006',
  fuel: 'Diesel',
  displacementCcm: 1896,
  powerKw: 77,
  owner: 'Max Mustermann',
};

beforeEach(async () => {
  vi.stubEnv('CLAUDE_API_KEY', 'test-key');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  // Je Test ein eigener Benutzer, damit die Anfragebegrenzung nicht zwischen Tests wirkt
  mocks.requireAuth.mockReset().mockResolvedValue({ mode: 'users', authenticated: true, user: { id: `u-${++userSeq}`, role: 'user' } });
  mocks.callClaude.mockReset().mockResolvedValue({ toolInput: GOLF });
  handler ??= (await import('../../pages/api/scan-registration')).default;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const scan = (body, ip = uniqueIp()) => call(handler, { body, ip });

describe('Zugriff und Eingaben', () => {
  it('erlaubt nur POST und verlangt Anmeldung', async () => {
    expect((await call(handler, { method: 'GET' })).statusCode).toBe(405);
    mocks.requireAuth.mockImplementation(async (req, res) => {
      res.status(401).json({});
      return null;
    });
    expect((await scan({ image: PNG })).statusCode).toBe(401);
    expect(mocks.callClaude).not.toHaveBeenCalled();
  });

  it('meldet fehlenden KI-Zugang mit 503', async () => {
    vi.stubEnv('CLAUDE_API_KEY', '');
    expect((await scan({ image: PNG })).statusCode).toBe(503);
  });

  it('akzeptiert nur JPEG, PNG und WebP als Data-URL', async () => {
    for (const image of [undefined, '', 'kein bild', 'data:text/html;base64,AAAA', 'data:image/gif;base64,AAAA', 'data:image/png;base64,***', 42]) {
      expect((await scan({ image })).statusCode).toBe(400);
    }
    expect(mocks.callClaude).not.toHaveBeenCalled();
  });

  it('lehnt zu große Bilder ab (413)', async () => {
    const big = `data:image/jpeg;base64,${'A'.repeat(4_000_001)}`;
    expect((await scan({ image: big })).statusCode).toBe(413);
    expect(mocks.callClaude).not.toHaveBeenCalled();
  });
});

describe('Auswertung', () => {
  it('sendet Bild und Anweisung mit dem Tool-Schema an Claude', async () => {
    await scan({ image: PNG });
    const [content, tool] = mocks.callClaude.mock.calls[0];
    expect(content[0]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/png' } });
    expect(content[1].type).toBe('text');
    expect(tool.name).toBe('report_registration');
  });

  it('liefert normalisierte Felder ohne Halterdaten', async () => {
    const res = await scan({ image: PNG });
    expect(res.statusCode).toBe(200);
    expect(res.body.fields).toMatchObject({
      vin: 'WVWZZZ1KZ6W612345',
      tsn: 'AZQ',
      firstRegistration: '2006-03-15',
      firstRegistrationYear: 2006,
      powerKw: 77,
      powerPs: 105,
    });
    expect(JSON.stringify(res.body)).not.toContain('Mustermann');
    expect(res.body.warnings).toEqual([]);
  });

  it('gibt Warnungen weiter (ungültige FIN, falsche Prüfziffer)', async () => {
    mocks.callClaude.mockResolvedValueOnce({ toolInput: { isRegistrationDocument: true, vin: 'WVWZZZ1KZ6W6I2345', make: 'VW' } });
    const bad = await scan({ image: PNG });
    expect(bad.body.fields.vin).toBeUndefined();
    expect(bad.body.warnings.join(' ')).toMatch(/ungültig/);

    mocks.callClaude.mockResolvedValueOnce({ toolInput: { isRegistrationDocument: true, vin: '1HGCM82633A004353' } });
    const checksum = await scan({ image: PNG });
    expect(checksum.body.warnings.join(' ')).toMatch(/Prüfziffer/);
  });

  it('meldet Bilder ohne Fahrzeugschein und ohne lesbare Daten mit 422', async () => {
    mocks.callClaude.mockResolvedValueOnce({ toolInput: { isRegistrationDocument: false } });
    expect((await scan({ image: PNG })).statusCode).toBe(422);
    mocks.callClaude.mockResolvedValueOnce({ toolInput: { isRegistrationDocument: true } });
    expect((await scan({ image: PNG })).statusCode).toBe(422);
    mocks.callClaude.mockResolvedValueOnce({ toolInput: null, content: 'Ich sehe nichts' });
    expect((await scan({ image: PNG })).statusCode).toBe(422);
  });

  it('meldet Claude-Fehler mit 502 samt Ursache', async () => {
    mocks.callClaude.mockRejectedValueOnce(new Error('Claude hat nicht rechtzeitig geantwortet'));
    const res = await scan({ image: PNG });
    expect(res.statusCode).toBe(502);
    expect(res.body.message).toContain('nicht rechtzeitig');
  });
});

describe('Anfragebegrenzung', () => {
  it('erlaubt 10 Scans pro Minute je Benutzer', async () => {
    mocks.requireAuth.mockResolvedValue({ mode: 'users', authenticated: true, user: { id: 'scan-limit', role: 'user' } });
    const codes = [];
    for (let i = 0; i < 12; i++) codes.push((await call(handler, { body: { image: PNG } })).statusCode);
    expect(codes.slice(0, 10).every((c) => c === 200)).toBe(true);
    expect(codes.slice(10)).toEqual([429, 429]);
  });
});
