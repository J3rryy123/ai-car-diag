// Einfache Begrenzung pro Schlüssel (z. B. IP) – gilt je Server-Instanz.
export const clientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';

export function createLimiter(windowMs, max) {
  const buckets = new Map();
  return (key) => {
    const now = Date.now();
    const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    buckets.set(key, recent);
    return recent.length > max;
  };
}
