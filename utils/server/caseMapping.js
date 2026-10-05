// Abbildung zwischen dem flachen Fall-Objekt der App und der Tabelle `cases`.
const TYPES = ['diagnose', 'obd2', 'guided', 'multi'];
const COLUMNS = ['id', 'created_at', 'type', 'customer', 'note', 'vehicle', 'vin', 'code', 'problem', 'created_by', 'data'];
const MAX_DATA_BYTES = 200 * 1024;

// Mitarbeiter sehen nur eigene Fälle; Administratoren (und Modi ohne Benutzerkonten) sehen alle.
export const isScoped = (session) => !!session.user && session.user.role !== 'admin';
export const ownOnly = (session) => (isScoped(session) ? `&created_by_id=eq.${session.user.id}` : '');

export const clip = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

// VIN einheitlich speichern (ohne Leerzeichen/Bindestriche, Großbuchstaben), damit sich Fälle eines Fahrzeugs finden lassen
export const normalizeVin = (value) => (typeof value === 'string' ? value.replace(/[\s-]/g, '').toUpperCase() : '');
export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function toRow(c) {
  if (!c || !TYPES.includes(c.type)) return null;
  const { type, customer, note, vehicle, vin, code, problem, id, createdAt, ...data } = c;
  if (JSON.stringify(data).length > MAX_DATA_BYTES) return null;
  const row = {
    type,
    customer: clip(customer, 200),
    note: clip(note, 5000),
    vehicle: clip(vehicle, 200),
    vin: clip(normalizeVin(vin), 17),
    code: clip(code, 200),
    problem: clip(problem, 2000),
    data
  };
  // Beim Import lokaler Fälle das ursprüngliche Datum behalten
  if (typeof createdAt === 'string' && !Number.isNaN(Date.parse(createdAt))) row.created_at = new Date(createdAt).toISOString();
  return row;
}

export function fromRow(row) {
  const flat = {};
  for (const key of COLUMNS) if (!['data', 'created_at', 'created_by'].includes(key)) flat[key] = row[key];
  return { ...row.data, ...flat, createdBy: row.created_by || '', createdAt: row.created_at };
}
