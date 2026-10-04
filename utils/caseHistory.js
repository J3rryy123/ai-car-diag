// Diagnoseverlauf: speichert Fälle lokal im Browser (localStorage)
const STORAGE_KEY = 'kfz-diagnose-history-v1';
const MAX_ENTRIES = 200;

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

export function loadCases() {
  if (!hasStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(cases) {
  if (!hasStorage()) return cases;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  } catch (error) {
    console.error('Verlauf konnte nicht gespeichert werden:', error);
  }
  return cases;
}

export function addCase(entry) {
  const newCase = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    customer: '',
    note: '',
    ...entry,
  };
  persist([newCase, ...loadCases()].slice(0, MAX_ENTRIES));
  return newCase;
}

export function updateCase(id, changes) {
  return persist(loadCases().map((c) => (c.id === id ? { ...c, ...changes } : c)));
}

export function deleteCase(id) {
  return persist(loadCases().filter((c) => c.id !== id));
}

export function searchCases(cases, query) {
  const q = query.trim().toLowerCase();
  if (!q) return cases;
  return cases.filter((c) =>
    [c.customer, c.note, c.vin, c.code, c.problem, c.vehicle]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  );
}
