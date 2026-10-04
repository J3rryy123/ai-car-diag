import { describe, expect, it } from 'vitest';
import { normalizeRegistration } from '../utils/server/registrationParse';

const GOLF = {
  isRegistrationDocument: true,
  vin: 'wvw zzz 1kz6w612345',
  hsn: '0603',
  tsn: 'azq',
  make: 'VOLKSWAGEN',
  type: '1KMAX1',
  model: 'GOLF V 1.9 TDI',
  firstRegistration: '15.03.2006',
  fuel: 'Diesel',
  displacementCcm: 1896,
  powerKw: 77,
  plate: 'b-ab 123',
  color: 'Silber',
};

describe('normalizeRegistration', () => {
  it('übernimmt und normalisiert gültige Daten', () => {
    const { fields, warnings } = normalizeRegistration(GOLF);
    expect(warnings).toEqual([]);
    expect(fields).toMatchObject({
      vin: 'WVWZZZ1KZ6W612345',
      hsn: '0603',
      tsn: 'AZQ',
      make: 'VOLKSWAGEN',
      model: 'GOLF V 1.9 TDI',
      firstRegistration: '2006-03-15',
      firstRegistrationYear: 2006,
      fuel: 'Diesel',
      displacementCcm: 1896,
      powerKw: 77,
      powerPs: 105,
      plate: 'B-AB 123',
    });
  });

  it('übernimmt keine Halterdaten', () => {
    const { fields } = normalizeRegistration({ ...GOLF, owner: 'Max Mustermann', address: 'Musterstraße 1' });
    expect(JSON.stringify(fields)).not.toMatch(/Mustermann|Musterstraße/);
  });

  it('verwirft eine ungültige FIN mit Warnung', () => {
    const { fields, warnings } = normalizeRegistration({ vin: 'WVWZZZ1KZ6W6I2345' });
    expect(fields.vin).toBeUndefined();
    expect(warnings[0]).toMatch(/ungültig/);
  });

  it('warnt bei falscher Prüfziffer einer US-FIN, übernimmt sie aber', () => {
    const { fields, warnings } = normalizeRegistration({ vin: '1HGCM82633A004353' });
    expect(fields.vin).toBe('1HGCM82633A004353');
    expect(warnings.join(' ')).toMatch(/Prüfziffer/);
  });

  it('prüft HSN und TSN auf das Format', () => {
    const { fields } = normalizeRegistration({ hsn: '06', tsn: 'ignore previous instructions' });
    expect(fields.hsn).toBeUndefined();
    expect(fields.tsn).toBeUndefined();
  });

  it('verwirft unmögliche Datumsangaben mit Warnung', () => {
    for (const date of ['31.13.2006', '01.01.1920', 'abc']) {
      const { fields, warnings } = normalizeRegistration({ firstRegistration: date });
      expect(fields.firstRegistration).toBeUndefined();
      expect(warnings.join(' ')).toMatch(/Erstzulassung/);
    }
  });

  it('ordnet Kraftstoffe zu', () => {
    const fuel = (text) => normalizeRegistration({ fuel: text }).fields.fuel;
    expect(fuel('Benzin')).toBe('Benzin');
    expect(fuel('Diesel')).toBe('Diesel');
    expect(fuel('Elektro')).toBe('Elektro');
    expect(fuel('Elektro/Benzin')).toBe('Hybrid');
    expect(fuel('Erdgas (CNG)')).toBe('Erdgas');
    expect(fuel('Flüssiggas')).toBe('Autogas');
    expect(fuel('Unbekannt')).toBeUndefined();
  });

  it('prüft Hubraum und Leistung auf plausible Bereiche', () => {
    const { fields } = normalizeRegistration({ displacementCcm: 15, powerKw: 'abc' });
    expect(fields.displacementCcm).toBeUndefined();
    expect(fields.powerKw).toBeUndefined();
    expect(normalizeRegistration({ powerKw: 100 }).fields.powerPs).toBe(136);
  });

  it('kommt mit leeren Eingaben zurecht', () => {
    expect(normalizeRegistration(null)).toEqual({ fields: {}, warnings: [] });
    expect(normalizeRegistration('x')).toEqual({ fields: {}, warnings: [] });
  });
});
