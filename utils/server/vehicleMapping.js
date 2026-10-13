// Abbildung zwischen dem flachen Fahrzeug-Objekt der App und der Tabelle `vehicles`.
import { clip, normalizeVin, VIN_PATTERN } from './caseMapping';

const MAX_DATA_BYTES = 50 * 1024;

// Editierbare Textfelder: Objektschlüssel -> Spalte und maximale Länge
export const FIELDS = {
  make: ['make', 100],
  model: ['model', 100],
  year: ['year', 10],
  engineType: ['engine_type', 50],
  licensePlate: ['license_plate', 20],
  customer: ['customer', 200],
  note: ['note', 5000]
};

export function toRow(v) {
  const vin = normalizeVin(v?.vin);
  if (!VIN_PATTERN.test(vin)) return null;
  const registration = v.registration && typeof v.registration === 'object' && !Array.isArray(v.registration) ? v.registration : null;
  if (registration && JSON.stringify(registration).length > MAX_DATA_BYTES) return null;
  const row = { vin, data: registration ? { registration } : {} };
  for (const [key, [column, max]] of Object.entries(FIELDS)) row[column] = clip(typeof v[key] === 'number' ? String(v[key]) : v[key], max);
  if (row.license_plate) row.license_plate = row.license_plate.toUpperCase();
  return row;
}

// Nur die übergebenen Textfelder (für PATCH); die VIN bleibt unverändert
export function toChanges(body) {
  const changes = {};
  for (const [key, [column, max]] of Object.entries(FIELDS)) {
    if (typeof body?.[key] === 'string') changes[column] = clip(body[key], max);
  }
  if (changes.license_plate) changes.license_plate = changes.license_plate.toUpperCase();
  return changes;
}

export function fromRow(row) {
  return {
    id: row.id,
    vin: row.vin,
    make: row.make || '',
    model: row.model || '',
    year: row.year || '',
    engineType: row.engine_type || '',
    licensePlate: row.license_plate || '',
    customer: row.customer || '',
    note: row.note || '',
    registration: row.data?.registration || null,
    createdBy: row.created_by || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  };
}
