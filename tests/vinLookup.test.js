import { describe, expect, it } from 'vitest';
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

  it('liefert null, wenn die Datenbank nichts Brauchbares kennt', () => {
    expect(mapVpicResult({ Make: 'BMW', Model: '', ErrorCode: '7' })).toBeNull();
    expect(mapVpicResult({ Model: 'Not Applicable' })).toBeNull();
    expect(mapVpicResult(null)).toBeNull();
  });
});
