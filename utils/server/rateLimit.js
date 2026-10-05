import { db, dbConfigured } from './supabase';

// Begrenzung pro Schlüssel (z. B. Benutzer oder IP).
export const clientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';

// Zähler im Arbeitsspeicher – gilt nur je Server-Instanz (Fallback ohne Datenbank).
export function createLimiter(windowMs, max) {
  const buckets = new Map();
  return (key) => {
    const now = Date.now();
    const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    buckets.set(key, recent);
    if (buckets.size > 1000) {
      for (const [k, times] of buckets) {
        if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
      }
    }
    return recent.length > max;
  };
}

const DB_TIMEOUT_MS = 1500;
const DB_RETRY_AFTER_MS = 60 * 1000;

/**
 * Zentrale Begrenzung über die Datenbank (Funktion rate_limit_hit in supabase/schema.sql), damit sie auch bei
 * mehreren Server-Instanzen (Vercel) wirkt. Feste Zeitfenster. Ist die Datenbank nicht eingerichtet oder
 * nicht erreichbar, greift automatisch der Zähler im Arbeitsspeicher; die Datenbank wird dann
 * frühestens nach einer Minute erneut versucht.
 * Rückgabe: async (key) => true, wenn das Limit überschritten ist.
 */
export function createRateLimiter(name, windowMs, max) {
  const local = createLimiter(windowMs, max);
  let retryAt = 0;
  return async (key) => {
    if (!dbConfigured() || Date.now() < retryAt) return local(key);
    try {
      const hits = await db('rpc/rate_limit_hit', {
        method: 'POST',
        body: { p_key: `${name}:${key}`, p_window_seconds: Math.max(1, Math.round(windowMs / 1000)) },
        timeoutMs: DB_TIMEOUT_MS
      });
      if (!Number.isInteger(hits)) throw new Error('unerwartete Antwort');
      return hits > max;
    } catch (error) {
      retryAt = Date.now() + DB_RETRY_AFTER_MS;
      console.warn(`Zentrale Begrenzung nicht verfügbar (${error.code || error.message}), nutze Arbeitsspeicher.`);
      return local(key);
    }
  };
}
