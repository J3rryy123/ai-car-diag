// Ergänzt die lokale VIN-Auswertung um Modell-/Motordaten aus der NHTSA-vPIC-Datenbank
// (kostenlos, ohne API-Key). Die Abdeckung ist für US-Fahrzeuge sehr gut, für Fahrzeuge
// außerhalb Nordamerikas lückenhaft – fehlende Werte bleiben dann leer.
const VPIC_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map();

const PS_PER_HP = 1.0139;

const text = (value) => {
  const v = typeof value === 'string' ? value.trim() : '';
  return v && v.toLowerCase() !== 'not applicable' ? v : null;
};

const FUELS = [
  [/electric/i, 'Elektro'],
  [/diesel/i, 'Diesel'],
  [/gasoline|flexible|e85|ethanol/i, 'Benzin'],
  [/compressed natural gas|cng/i, 'Erdgas'],
  [/liquefied petroleum|lpg|propane/i, 'Autogas'],
  [/hydrogen|fuel cell/i, 'Wasserstoff']
];

function mapFuel(primary, electrification) {
  if (/phev|hev|mild|plug-in|hybrid/i.test(electrification || '')) return 'Hybrid';
  if (/hybrid/i.test(primary || '')) return 'Hybrid';
  if (/^bev/i.test(electrification || '')) return 'Elektro';
  const hit = FUELS.find(([re]) => re.test(primary || ''));
  return hit ? hit[1] : null;
}

// Wandelt die vPIC-Zeile in unser Format um. Gibt null zurück, wenn nichts Brauchbares enthalten ist.
export function mapVpicResult(row) {
  if (!row || typeof row !== 'object') return null;

  const model = text(row.Model);
  const trim = text(row.Trim) || text(row.Series);
  const displacement = Number.parseFloat(row.DisplacementL);
  const hp = Number.parseFloat(row.EngineHP);
  const cylinders = Number.parseInt(row.EngineCylinders, 10);
  const fuelType = mapFuel(text(row.FuelTypePrimary), text(row.ElectrificationLevel));

  const engine = {
    name: text(row.EngineModel),
    displacement: Number.isFinite(displacement) && displacement > 0 ? `${displacement.toFixed(1)}L` : null,
    fuelType,
    power: Number.isFinite(hp) && hp > 0 ? `${Math.round(hp * PS_PER_HP)} PS` : null,
    cylinders: Number.isFinite(cylinders) && cylinders > 0 ? cylinders : null,
    turbo: text(row.Turbo) ? /turbo/i.test(row.Turbo) : null,
    configuration: text(row.EngineConfiguration)
  };
  const hasEngine = Object.values(engine).some((v) => v !== null);

  const result = {
    model: model ? { series: trim ? `${model} ${trim}` : model } : null,
    engine: hasEngine ? engine : null,
    modelYear: Number.parseInt(row.ModelYear, 10) || null,
    bodyClass: text(row.BodyClass),
    driveType: text(row.DriveType),
    transmission: text(row.TransmissionStyle),
    plantCity: text(row.PlantCity),
    source: 'NHTSA vPIC'
  };
  return result.model || result.engine || result.bodyClass ? result : null;
}

// Liefert { found, data } oder wirft bei Netzwerk-/Serverfehlern.
export async function lookupVin(vin) {
  const hit = cache.get(vin);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const response = await fetch(`${VPIC_URL}/${encodeURIComponent(vin)}?format=json`, {
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`vPIC HTTP ${response.status}`);
  const json = await response.json();
  const data = mapVpicResult(json?.Results?.[0]);
  const value = { found: Boolean(data), data };

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(vin, { at: Date.now(), value });
  return value;
}
