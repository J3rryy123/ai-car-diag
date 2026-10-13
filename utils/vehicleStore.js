// Fahrzeugspeicher: VIN und Fahrzeugdaten in der Datenbank (über /api/vehicles).
// Ist keine Datenbank konfiguriert (HTTP 503), wird automatisch der lokale Browserspeicher genutzt.
import { UnauthorizedError } from './caseHistory';

const STORAGE_KEY = 'kfz-vehicles-v1';
const MAX_LOCAL_ENTRIES = 500;

export const normalizeVin = (value) => String(value || '').replace(/[\s-]/g, '').toUpperCase();
export const isValidVin = (value) => /^[A-HJ-NPR-Z0-9]{17}$/.test(normalizeVin(value));

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

function loadLocal() {
  if (!hasStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocal(vehicles) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles.slice(0, MAX_LOCAL_ENTRIES)));
  } catch (error) {
    console.error('Fahrzeuge konnten nicht lokal gespeichert werden:', error);
  }
}

async function request(path, options) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });
  if (response.status === 401) throw new UnauthorizedError('Bitte anmelden.');
  const data = await response.json().catch(() => ({}));
  if (response.status === 503 && data.code === 'db_not_configured') return { fallback: true };
  if (!response.ok) throw new Error(data.message || `Fehler (HTTP ${response.status})`);
  return { data };
}

/** Modell-/Motordaten aus der VIN-Auswertung zum Speichern (null, wenn nichts Brauchbares vorliegt). */
export function pickVinData(decoded) {
  if (!decoded?.isValid) return null;
  const data = {};
  if (decoded.model?.series) data.model = { series: decoded.model.series };
  if (decoded.engine) data.engine = decoded.engine;
  if (decoded.body) data.body = decoded.body;
  if (decoded.dataSource) data.dataSource = decoded.dataSource;
  return Object.keys(data).length ? data : null;
}

/** Alle gespeicherten Fahrzeuge, zuletzt geänderte zuerst: { vehicles, storage: 'database' | 'local' } */
export async function loadVehicles() {
  const { fallback, data } = await request('/api/vehicles');
  return fallback ? { vehicles: loadLocal(), storage: 'local' } : { vehicles: data.vehicles, storage: 'database' };
}

/** Speichert ein Fahrzeug; ein vorhandener Eintrag zur selben VIN wird aktualisiert. Liefert { vehicle, created }. */
export async function saveVehicle(vehicle) {
  const vin = normalizeVin(vehicle.vin);
  if (!isValidVin(vin)) throw new Error('Bitte eine gültige 17-stellige VIN angeben.');
  const { fallback, data } = await request('/api/vehicles', { method: 'POST', body: { ...vehicle, vin } });
  if (!fallback) return data;

  const local = loadLocal();
  const existing = local.find((v) => v.vin === vin);
  const now = new Date().toISOString();
  const saved = {
    ...existing,
    ...vehicle,
    vin,
    id: existing?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  saveLocal([saved, ...local.filter((v) => v.vin !== vin)]);
  return { vehicle: saved, created: !existing };
}

export async function deleteVehicle(id, storage) {
  if (storage === 'database') {
    await request(`/api/vehicles/${id}`, { method: 'DELETE' });
    return;
  }
  saveLocal(loadLocal().filter((v) => v.id !== id));
}

/** Filtert nach VIN, Kennzeichen, Kunde, Marke, Modell oder Notiz. */
export function searchVehicles(vehicles, query) {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return vehicles;
  return vehicles.filter((v) =>
    [v.vin, v.licensePlate, v.customer, v.make, v.model, v.year, v.note]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  );
}
