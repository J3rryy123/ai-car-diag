// Diagnoseverlauf: speichert Fälle in der Datenbank (über /api/cases).
// Ist keine Datenbank konfiguriert (HTTP 503), wird automatisch der lokale Browserspeicher genutzt.
const STORAGE_KEY = 'kfz-diagnose-history-v1';
const MAX_LOCAL_ENTRIES = 200;

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

// --- lokaler Speicher (Fallback) -------------------------------------------
export function loadLocalCases() {
  if (!hasStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalCases(cases) {
  if (!hasStorage()) return cases;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  } catch (error) {
    console.error('Verlauf konnte nicht gespeichert werden:', error);
  }
  return cases;
}

export const clearLocalCases = () => hasStorage() && window.localStorage.removeItem(STORAGE_KEY);

// --- API -------------------------------------------------------------------
export class UnauthorizedError extends Error {}

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

/** Liefert { cases, storage: 'database' | 'local' } */
export async function loadCases() {
  const { fallback, data } = await request('/api/cases');
  if (fallback) return { cases: loadLocalCases(), storage: 'local' };
  return { cases: data.cases, storage: 'database', scope: data.scope };
}

const normalizeVin = (value) => String(value || '').replace(/[\s-]/g, '').toUpperCase();

/** Fälle eines Fahrzeugs (nach VIN), neueste zuerst. Ohne Datenbank aus dem lokalen Speicher. */
export async function loadVehicleCases(vin) {
  const wanted = normalizeVin(vin);
  const { fallback, data } = await request(`/api/cases?vin=${encodeURIComponent(wanted)}`);
  if (fallback) return loadLocalCases().filter((c) => normalizeVin(c.vin) === wanted);
  return data.cases;
}

export async function addCase(entry) {
  const { fallback, data } = await request('/api/cases', { method: 'POST', body: entry });
  if (!fallback) return data.cases[0];
  const newCase = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    customer: '',
    note: '',
    ...entry
  };
  saveLocalCases([newCase, ...loadLocalCases()].slice(0, MAX_LOCAL_ENTRIES));
  return newCase;
}

export async function updateCase(id, changes, storage) {
  if (storage === 'database') {
    await request(`/api/cases/${id}`, { method: 'PATCH', body: changes });
    return;
  }
  saveLocalCases(loadLocalCases().map((c) => (c.id === id ? { ...c, ...changes } : c)));
}

export async function deleteCase(id, storage) {
  if (storage === 'database') {
    await request(`/api/cases/${id}`, { method: 'DELETE' });
    return;
  }
  saveLocalCases(loadLocalCases().filter((c) => c.id !== id));
}

/** Überträgt die lokal gespeicherten Fälle in die Datenbank und leert danach den lokalen Speicher. */
export async function importLocalCases() {
  const local = loadLocalCases();
  if (!local.length) return 0;
  const { fallback } = await request('/api/cases', { method: 'POST', body: { cases: local } });
  if (fallback) throw new Error('Datenbank ist nicht konfiguriert.');
  clearLocalCases();
  return local.length;
}

export function searchCases(cases, query) {
  const q = query.trim().toLowerCase();
  if (!q) return cases;
  return cases.filter((c) =>
    [c.customer, c.note, c.vin, c.code, c.problem, c.vehicle, c.createdBy]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  );
}
