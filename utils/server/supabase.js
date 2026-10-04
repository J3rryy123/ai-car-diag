// Minimaler Supabase-Client (PostgREST) – nur serverseitig verwenden, der Service-Key darf nie in den Browser.
export const dbConfigured = () => !!(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

export class DbError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Akzeptiert auch URLs mit Schrägstrich am Ende oder mit angehängtem /rest/v1
const baseUrl = () => process.env.SUPABASE_URL.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export async function db(path, { method = 'GET', body, prefer } = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  let response;
  try {
    response = await fetch(`${baseUrl()}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: key,
        // Neue "Secret keys" (sb_secret_…) sind keine JWTs und dürfen nicht als Bearer-Token gesendet werden
        ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (error) {
    console.error('Supabase nicht erreichbar:', error.cause?.code || error.message);
    throw new DbError('unreachable', { code: error.cause?.code });
  }

  if (!response.ok) {
    const text = await response.text();
    let detail = {};
    try { detail = JSON.parse(text); } catch { /* kein JSON */ }
    console.error('Supabase error:', response.status, text);
    throw new DbError(detail.message || `HTTP ${response.status}`, { status: response.status, code: detail.code });
  }
  return response.status === 204 ? null : response.json();
}

/** Antwortet mit einer verständlichen Fehlermeldung (enthält keine Zugangsdaten). */
export function sendDbError(res, error) {
  let message = 'Datenbankfehler. Details stehen in den Vercel-Logs.';
  if (error.message === 'unreachable') {
    message = 'Supabase nicht erreichbar. SUPABASE_URL prüfen (Format: https://<projekt>.supabase.co).';
  } else if (error.status === 401 || error.status === 403) {
    message = 'Zugriff von Supabase abgelehnt. SUPABASE_SERVICE_ROLE_KEY prüfen (Key „service_role“ bzw. „Secret key“, nicht „anon“/„publishable“).';
  } else if (error.code === 'PGRST205' || error.code === '42P01') {
    message = 'Tabelle „cases“ oder „app_users“ nicht gefunden. supabase/schema.sql im SQL Editor ausführen.';
  } else if (error.code === '42703' || error.code === 'PGRST204') {
    message = 'Datenbank-Schema veraltet. supabase/schema.sql erneut im SQL Editor ausführen.';
  } else if (error.status === 404) {
    message = 'Supabase-Adresse nicht gefunden. SUPABASE_URL prüfen (Project-URL ohne Zusatz).';
  } else if (error.status) {
    message = `Datenbankfehler (HTTP ${error.status}): ${String(error.message).slice(0, 200)}`;
  }
  return res.status(502).json({ code: 'db_error', message });
}
