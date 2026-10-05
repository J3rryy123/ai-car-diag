// Kleine Nachbildung der PostgREST-Aufrufe, die die App über utils/server/supabase.js macht.
let seq = 0;
export const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

export function createFakeDb({ users = [], cases = [] } = {}) {
  const state = { users: [...users], cases: [...cases], calls: [], hits: new Map() };

  const filterBy = (rows, path) => {
    const id = /[?&]id=eq\.([^&]+)/.exec(path)?.[1];
    const owner = /[&?]created_by_id=eq\.([^&]+)/.exec(path)?.[1];
    return rows.filter((r) => (!id || r.id === id) && (!owner || r.created_by_id === owner));
  };

  const db = async (path, { method = 'GET', body } = {}) => {
    state.calls.push({ path, method, body });

    // Zentrale Anfragebegrenzung (Funktion rate_limit_hit)
    if (path === 'rpc/rate_limit_hit') {
      const hits = (state.hits.get(body.p_key) || 0) + 1;
      state.hits.set(body.p_key, hits);
      return hits;
    }

    if (path.startsWith('app_users')) {
      if (method === 'POST') {
        const user = { id: uuid(), active: true, created_at: '2026-01-01T00:00:00Z', ...body };
        state.users.push(user);
        return [user];
      }
      const username = /username=eq\.([^&]+)/.exec(path)?.[1];
      const id = /[?&]id=eq\.([^&]+)/.exec(path)?.[1];
      const matches = state.users.filter((u) => (!username || u.username === username) && (!id || u.id === id));
      if (method === 'PATCH') {
        matches.forEach((u) => Object.assign(u, body));
        return matches;
      }
      if (method === 'DELETE') {
        state.users = state.users.filter((u) => !matches.includes(u));
        return null;
      }
      return username || id ? matches : state.users;
    }

    if (path.startsWith('cases')) {
      if (method === 'POST') {
        const created = body.map((row) => ({ id: uuid(), created_at: '2026-01-01T00:00:00Z', ...row }));
        state.cases.push(...created);
        return created;
      }
      const matches = filterBy(state.cases, path);
      if (method === 'PATCH') {
        matches.forEach((c) => Object.assign(c, body));
        return matches;
      }
      if (method === 'DELETE') {
        state.cases = state.cases.filter((c) => !matches.includes(c));
        return matches;
      }
      return matches;
    }

    throw new Error(`Unerwarteter Datenbankaufruf: ${method} ${path}`);
  };

  return { db, state };
}
