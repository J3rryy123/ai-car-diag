import { describe, expect, it } from 'vitest';
import { cleanHsn, cleanTsn, HSN_PATTERN, TSN_PATTERN, withHsnTsn } from '../utils/hsnTsn';
import { searchVehicles } from '../utils/vehicleStore';

describe('HSN/TSN bereinigen', () => {
  it('macht Großbuchstaben, entfernt Trennzeichen und kürzt auf die Länge', () => {
    expect(cleanHsn(' 06-03x9 ')).toBe('0603');
    expect(cleanTsn('bkw 123')).toBe('BKW');
    expect(cleanHsn(null)).toBe('');
  });

  it('prüft die Formate (HSN 4, TSN 3 Zeichen)', () => {
    expect(HSN_PATTERN.test('0603')).toBe(true);
    expect(HSN_PATTERN.test('060')).toBe(false);
    expect(TSN_PATTERN.test('BKW')).toBe(true);
    expect(TSN_PATTERN.test('BK')).toBe(false);
  });
});

describe('withHsnTsn', () => {
  it('ergänzt HSN/TSN und behält übrige Fahrzeugschein-Daten', () => {
    expect(withHsnTsn({ vin: 'X', powerKw: 77 }, '0603', 'BKW')).toEqual({ vin: 'X', powerKw: 77, hsn: '0603', tsn: 'BKW' });
  });

  it('liefert null, wenn nichts übrig bleibt, und entfernt geleerte Felder', () => {
    expect(withHsnTsn(null, '', '')).toBeNull();
    expect(withHsnTsn({ hsn: '0603', tsn: 'BKW' }, '', '')).toBeNull();
    expect(withHsnTsn({ hsn: '0603', tsn: 'BKW', powerKw: 77 }, '', 'BKW')).toEqual({ powerKw: 77, tsn: 'BKW' });
  });
});

describe('Fahrzeugsuche nach HSN/TSN', () => {
  const vehicles = [
    { id: 1, vin: 'A', make: 'VW', registration: { hsn: '0603', tsn: 'BKW' } },
    { id: 2, vin: 'B', make: 'BMW', registration: null },
  ];
  it('findet Fahrzeuge über HSN oder TSN', () => {
    expect(searchVehicles(vehicles, '0603').map((v) => v.id)).toEqual([1]);
    expect(searchVehicles(vehicles, 'bkw').map((v) => v.id)).toEqual([1]);
  });
});
