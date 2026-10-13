// Ergänzt die lokale VIN-Auswertung um Modell-/Motordaten aus der NHTSA-vPIC-Datenbank
// (kostenlos, ohne API-Key). Die Abdeckung ist für US-Fahrzeuge sehr gut, für Fahrzeuge
// außerhalb Nordamerikas lückenhaft – fehlende Werte bleiben dann leer.
import { db, dbConfigured } from './supabase';

const VPIC_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map();

// Persistent cache (table vin_cache): vehicle data for a VIN rarely changes, so a hit means
// no external request at all (and no cost if a paid provider is added later).
// Misses are cached for a shorter time because the upstream database gets updated.
const DB_FOUND_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const DB_MISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DB_TIMEOUT_MS = 3000;
// PostgREST / Postgres codes for "table does not exist"
const MISSING_TABLE_CODES = new Set(['PGRST205', '42P01']);
let persistentCacheDisabled = false;

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

  // vPIC liefert Hersteller in Großbuchstaben ("BMW", "VOLKSWAGEN") → in normale Schreibweise bringen
  const KEEP_UPPER = new Set(['BMW', 'MINI', 'KIA', 'RAM', 'GMC', 'MG', 'BYD', 'DS']);
  const makeRaw = text(row.Make);
  const make = makeRaw && !KEEP_UPPER.has(makeRaw.toUpperCase())
    ? makeRaw.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase())
    : makeRaw?.toUpperCase() ?? null;

  const result = {
    make,
    model: model ? { series: trim ? `${model} ${trim}` : model } : null,
    engine: hasEngine ? engine : null,
    modelYear: Number.parseInt(row.ModelYear, 10) || null,
    bodyClass: text(row.BodyClass),
    driveType: text(row.DriveType),
    transmission: text(row.TransmissionStyle),
    plantCity: text(row.PlantCity),
    source: 'NHTSA vPIC'
  };
  return result.model || result.engine || result.bodyClass || result.make ? result : null;
}

// Cache problems must never break a lookup: every failure falls back to the external database.
function persistentCacheUsable() {
  return !persistentCacheDisabled && dbConfigured();
}

function handleCacheError(error) {
  if (MISSING_TABLE_CODES.has(error?.code)) {
    persistentCacheDisabled = true;
    console.warn('vin_cache table not found - persistent VIN cache disabled. Run supabase/schema.sql to enable it.');
  }
}

async function readPersistent(vin) {
  if (!persistentCacheUsable()) return null;
  try {
    const rows = await db(`vin_cache?select=found,data,fetched_at&vin=eq.${vin}&limit=1`, { timeoutMs: DB_TIMEOUT_MS });
    const row = rows?.[0];
    if (!row) return null;
    const age = Date.now() - Date.parse(row.fetched_at);
    // A missing or unparsable timestamp makes the comparison false, so the row counts as expired
    if (!(age < (row.found ? DB_FOUND_TTL_MS : DB_MISS_TTL_MS))) return null;
    if (row.found && !row.data) return null;
    return { found: Boolean(row.found), data: row.found ? row.data : null };
  } catch (error) {
    handleCacheError(error);
    return null;
  }
}

async function writePersistent(vin, value) {
  if (!persistentCacheUsable()) return;
  try {
    await db('vin_cache?on_conflict=vin', {
      method: 'POST',
      body: {
        vin,
        found: value.found,
        data: value.data,
        source: value.data?.source ?? '',
        fetched_at: new Date().toISOString()
      },
      prefer: 'resolution=merge-duplicates,return=representation',
      timeoutMs: DB_TIMEOUT_MS
    });
  } catch (error) {
    handleCacheError(error);
  }
}

function remember(vin, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(vin, { at: Date.now(), value });
}

// Liefert { found, data } oder wirft bei Netzwerk-/Serverfehlern.
// Order: in-memory cache -> persistent cache (database) -> external lookup (NHTSA vPIC).
export async function lookupVin(vin) {
  const hit = cache.get(vin);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const stored = await readPersistent(vin);
  if (stored) {
    remember(vin, stored);
    return stored;
  }

  const response = await fetch(`${VPIC_URL}/${encodeURIComponent(vin)}?format=json`, {
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`vPIC HTTP ${response.status}`);
  const json = await response.json();
  const data = mapVpicResult(json?.Results?.[0]);
  const value = { found: Boolean(data), data };

  remember(vin, value);
  await writePersistent(vin, value);
  return value;
}
