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

  it('akzeptiert unbekannte Herstellercodes als gültige VIN, ohne einen Hersteller zu erfinden', () => {
    const result = VIN_DECODER.decodeVIN('XXXZZZ1KZ6W612345');
    expect(result.isValid).toBe(true);
    expect(result.manufacturer).toEqual({ name: null, country: null, wmi: 'XXX', matchedBy: null });
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

describe('Herstellertabelle', () => {
  const table = VIN_DECODER.manufacturers;

  it('enthält nur gültige Herstellercodes (3 Stellen, keine I/O/Q) mit Hersteller und Land', () => {
    for (const [wmi, entry] of Object.entries(table)) {
      expect(wmi, wmi).toMatch(/^[A-HJ-NPR-Z0-9]{3}$/);
      expect(entry.make, wmi).toBeTruthy();
      expect(entry.country, wmi).toBeTruthy();
    }
  });

  it('ordnet bekannte Herstellercodes richtig zu', () => {
    const expected = {
      WBA: 'BMW', WBS: 'BMW', WBY: 'BMW', WBX: 'BMW', WB1: 'BMW', '4US': 'BMW', '5UX': 'BMW', '5YM': 'BMW', LBV: 'BMW',
      WMW: 'MINI', SCA: 'Rolls-Royce', WDB: 'Mercedes-Benz', W1K: 'Mercedes-Benz', LE4: 'Mercedes-Benz',
      WAU: 'Audi', TRU: 'Audi', WVW: 'Volkswagen', LFV: 'Volkswagen', WP0: 'Porsche', W0L: 'Opel',
      TMB: 'Škoda', VSS: 'SEAT', UU1: 'Dacia', ZHW: 'Lamborghini', ZLA: 'Lancia', SBM: 'McLaren',
      LRW: 'Tesla', LTV: 'Toyota', VS6: 'Ford', JTH: 'Lexus', KMT: 'Genesis', LGX: 'BYD', L6T: 'Geely',
    };
    for (const [wmi, make] of Object.entries(expected)) {
      expect(table[wmi]?.make, wmi).toBe(make);
    }
  });

  it('kennt alle BMW-Codes aus der Praxis (Pkw, M, i, SUV, Motorrad, USA, China)', () => {
    for (const wmi of ['WBA', 'WBS', 'WBY', 'WBX', 'WB1', '4US', '5UX', '5YM', 'LBV']) {
      expect(table[wmi].make).toBe('BMW');
    }
  });
});

describe('Zuordnung nach Anfang des Herstellercodes', () => {
  it('erkennt BMW auch bei nicht gelisteten Codes mit WB…', () => {
    const result = VIN_DECODER.decodeVIN('WB3A5C5050LB12345');
    expect(result.isValid).toBe(true);
    expect(result.manufacturer).toMatchObject({ name: 'BMW', country: 'Deutschland', matchedBy: 'prefix' });
  });

  it('bevorzugt den genauen Code vor dem Anfang', () => {
    expect(VIN_DECODER.decodeVIN('WBAVA31010NL12345').manufacturer.matchedBy).toBe('wmi');
  });

  it('nutzt Anfänge nur, wo sie eindeutig sind', () => {
    // WM… gehört mehreren Herstellern (MINI, smart, MAN) → ohne genauen Code bleibt der Hersteller offen
    expect(VIN_DECODER.makePrefixes.WM).toBeUndefined();
    expect(VIN_DECODER.decodeVIN('WM5ZZZ1KZ6W612345').manufacturer.name).toBeNull();
  });
});

describe('BMW-Beispiele', () => {
  it.each([
    ['WBA8E9C50GK123456', 2016],
    ['WBS8M9C50J5K12345', 2018],
    ['WBY1Z2C50FV123456', 2015],
    ['WBXHT3C30J5K12345', 2018],
  ])('%s wird als BMW erkannt, Baujahr %i', (vin, year) => {
    const result = VIN_DECODER.decodeVIN(vin);
    expect(result.isValid).toBe(true);
    expect(result.manufacturer.name).toBe('BMW');
    expect(result.year.modelYear).toBe(year);
  });

  it('BMW aus den USA (5UX) verlangt eine korrekte Prüfziffer', () => {
    expect(VIN_DECODER.decodeVIN('5UXKR0C58G0S12345').isValid).toBe(false);
  });
});

describe('Hersteller aus der Fahrzeugdatenbank', () => {
  it('ergänzt einen lokal unbekannten Hersteller', () => {
    const local = VIN_DECODER.decodeVIN('XXXZZZ1KZ6W612345');
    const merged = VIN_DECODER.mergeRemote(local, { make: 'Lada', model: null, engine: null });
    expect(merged.manufacturer).toMatchObject({ name: 'Lada', matchedBy: 'database' });
  });

  it('überschreibt einen lokal bekannten Hersteller nicht', () => {
    const local = VIN_DECODER.decodeVIN('WVWZZZ1KZ6W612345');
    const merged = VIN_DECODER.mergeRemote(local, { make: 'Fremdmarke' });
    expect(merged.manufacturer.name).toBe('Volkswagen');
  });
});
