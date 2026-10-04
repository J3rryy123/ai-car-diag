// Minimaler Supabase-Client (PostgREST) – nur serverseitig verwenden, der Service-Key darf nie in den Browser.
export const dbConfigured = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function db(path, { method = 'GET', body, prefer } = {}) {
  const base = process.env.SUPABASE_URL.replace(/\/+$/, '');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    console.error('Supabase error:', response.status, await response.text());
    throw new Error(`Datenbankfehler (HTTP ${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}
