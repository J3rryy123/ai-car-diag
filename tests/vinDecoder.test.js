import { describe, expect, it } from 'vitest';
import VIN_DECODER from '../utils/vinDecoder';

// 1HGCM82633A004352: bekannte VIN mit gültiger Prüfziffer (Honda Accord, 2003)
const HONDA = '1HGCM82633A004352';

describe('cleanVIN / isVinFormat', () => {
  it('entfernt Leerzeichen und Bindestriche und macht Großbuchstaben', () => {
    expect(VIN_DECODER.cleanVIN(' 1hgcm 8263-3a004352 ')).toBe(HONDA);
  });

  it('verarbeitet leere und fehlende Eingaben', () => {
    expect(VIN_DECODER.cleanVIN(undefined)).toBe('');
    expect(VIN_DECODER.cleanVIN(null)).toBe('');
  });

  it('erlaubt I, O und Q nicht', () => {
    expect(VIN_DECODER.isVinFormat(HONDA)).toBe(true);
    expect(VIN_DECODER.isVinFormat('1HGCM82633A00435I')).toBe(false);
    expect(VIN_DECODER.isVinFormat('1HGCM82633A00435O')).toBe(false);
    expect(VIN_DECODER.isVinFormat('1HGCM82633A00435Q')).toBe(false);
    expect(VIN_DECODER.isVinFormat('1HGCM82633A00435')).toBe(false);
  });
});

describe('checkDigitValid', () => {
  it('erkennt die korrekte Prüfziffer', () => {
    expect(VIN_DECODER.checkDigitValid(HONDA)).toBe(true);
  });

  it('erkennt eine falsche Prüfziffer', () => {
    expect(VIN_DECODER.checkDigitValid('1HGCM82633A004353')).toBe(false);
    expect(VIN_DECODER.checkDigitValid('1HGCM82643A004352')).toBe(false);
  });
});

describe('decodeVIN', () => {
  it('liefert null ohne Eingabe', () => {
    expect(VIN_DECODER.decodeVIN('')).toBeNull();
  });

  it('meldet falsche Länge und ungültige Zeichen', () => {
    expect(VIN_DECODER.decodeVIN('ABC').isValid).toBe(false);
    const invalid = VIN_DECODER.decodeVIN('1HGCM82633A00435I');
    expect(invalid.isValid).toBe(false);
    expect(invalid.error).toMatch(/ungültige Zeichen/);
  });

  it('meldet unbekannte Herstellercodes', () => {
    const result = VIN_DECODER.decodeVIN('ZZZZZZZZZZZZZZZZZ');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/Herstellercode/);
  });

  it('dekodiert Hersteller, Land und Baujahr einer US-VIN sicher', () => {
    const result = VIN_DECODER.decodeVIN(HONDA);
    expect(result.isValid).toBe(true);
    expect(result.manufacturer.name).toBe('Honda');
    expect(result.year.modelYear).toBe(2003);
    expect(result.year.confidence).toBe('high');
    expect(result.checkDigit).toEqual({ checked: true, valid: true });
  });

  it('lehnt eine US-VIN mit falscher Prüfziffer ab', () => {
    const result = VIN_DECODER.decodeVIN('1HGCM82633A004353');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/Prüfziffer/);
  });

  it('akzeptiert eine europäische VIN ohne Prüfziffernpflicht, Baujahr nur als Schätzung', () => {
    const result = VIN_DECODER.decodeVIN('WVWZZZ1KZ6W612345');
    expect(result.isValid).toBe(true);
    expect(result.manufacturer.name).toBe('Volkswagen');
    expect(result.manufacturer.country).toBe('Deutschland');
    expect(result.year.modelYear).toBe(2006);
    expect(result.year.confidence).toBe('estimated');
    expect(result.checkDigit.checked).toBe(false);
  });

  it('erfindet weder Modell noch Motor', () => {
    const result = VIN_DECODER.decodeVIN('WVWZZZ1KZ6W612345');
    expect(result.model.series).toBeNull();
    expect(result.engine).toBeNull();
  });

  it('liefert kein Baujahr bei nicht belegtem Jahrescode', () => {
    // Stelle 10 = '0' ist kein gültiger Jahrescode
    const result = VIN_DECODER.decodeVIN('WBAVA31010NL12345');
    expect(result.isValid).toBe(true);
    expect(result.year.modelYear).toBeNull();
    expect(result.year.age).toBeNull();
  });

  it('nimmt Leerzeichen und Kleinbuchstaben in Kauf', () => {
    expect(VIN_DECODER.decodeVIN('wvw zzz 1kz6w612345').manufacturer.name).toBe('Volkswagen');
  });
});

describe('decodeYear', () => {
  const nextYear = new Date().getFullYear() + 1;

  it('verwirft Jahre in der fernen Zukunft', () => {
    // Code 'Y' = 2030; in den nächsten Jahren noch nicht plausibel
    if (nextYear < 2030) {
      expect(VIN_DECODER.decodeYear('WVWZZZ1KZYW612345', 'WVW').modelYear).toBe(2000);
    }
  });

  it('unterscheidet bei US-VINs über Stelle 7 zwischen 1980–2009 und ab 2010', () => {
    // Stelle 7 Ziffer → 1980–2009, Buchstabe → ab 2010; Stelle 10 = 'D' bzw. '3'
    expect(VIN_DECODER.decodeYear('1HGCM8A63DA004352', '1HG')).toEqual({ modelYear: 2013, confidence: 'high' });
    expect(VIN_DECODER.decodeYear('1HGCM82633A004352', '1HG')).toEqual({ modelYear: 2003, confidence: 'high' });
  });

  it('liefert kein Jahr bei ungültigem Jahrescode', () => {
    expect(VIN_DECODER.decodeYear('1HGCM82630A004352', '1HG')).toEqual({ modelYear: null, confidence: 'none' });
  });
});

describe('mergeRemote', () => {
  const local = () => VIN_DECODER.decodeVIN('WVWZZZ1KZ6W612345');

  it('ergänzt Modell und Motor, behält den lokalen Hersteller', () => {
    const merged = VIN_DECODER.mergeRemote(local(), {
      model: { series: 'Golf V' },
      engine: { displacement: '1.9L', fuelType: 'Diesel' },
      source: 'NHTSA vPIC',
    });
    expect(merged.manufacturer.name).toBe('Volkswagen');
    expect(merged.model.series).toBe('Golf V');
    expect(merged.engine.fuelType).toBe('Diesel');
    expect(merged.dataSource).toBe('NHTSA vPIC');
  });

  it('gibt die lokale Auswertung unverändert zurück ohne Datenbankdaten oder bei ungültiger VIN', () => {
    const base = local();
    expect(VIN_DECODER.mergeRemote(base, null)).toBe(base);
    const invalid = { isValid: false, error: 'x' };
    expect(VIN_DECODER.mergeRemote(invalid, { model: { series: 'X' } })).toBe(invalid);
  });
});
