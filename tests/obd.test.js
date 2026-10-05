import { describe, expect, it } from 'vitest';
import OBD2_DECODER from '../utils/obdDecoder';
import { analyzeCodes, parseCodes } from '../utils/multiCodeAnalysis';

describe('OBD2_DECODER.decodeCode', () => {
  it('kennt Standardcodes und ignoriert die Schreibweise', () => {
    const info = OBD2_DECODER.decodeCode('p0171');
    expect(info.description).toMatch(/mager/);
    expect(info.commonCauses.length).toBeGreaterThan(0);
  });

  it('liefert für unbekannte Codes eine Rückfall-Antwort', () => {
    expect(OBD2_DECODER.decodeCode('P0999').description).toBe('Unbekannter Fehlercode');
  });
});

describe('parseCodes', () => {
  it('trennt gültige und ungültige Codes, ohne Doppelte', () => {
    const { valid, invalid } = parseCodes('p0301, P0302;P0301 xyz 12');
    expect(valid).toEqual(['P0301', 'P0302']);
    expect(invalid).toEqual(['XYZ', '12']);
  });
});

describe('analyzeCodes', () => {
  it('ordnet dringende Fehler zuerst und erkennt Zusammenhänge', () => {
    const result = analyzeCodes(['P0171', 'P0174']);
    expect(result.entries).toHaveLength(2);
    expect(result.correlations.map((c) => c.id)).toContain('lean-both');
    expect(result.unknownCount).toBe(0);
  });

  it('zählt unbekannte Codes', () => {
    expect(analyzeCodes(['P0999']).unknownCount).toBe(1);
  });
});
