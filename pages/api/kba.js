import { requireAuth } from '../../utils/server/auth';
import { clientIp, createRateLimiter } from '../../utils/server/rateLimit';
import { dbConfigured } from '../../utils/server/supabase';
import { lookupKba } from '../../utils/server/kba';

const isLimited = createRateLimiter('kba', 60 * 1000, 60);
const HSN_PATTERN = /^[0-9A-Z]{4}$/;
const TSN_PATTERN = /^[0-9A-Z]{3}$/;

// Hersteller (aus HSN) und Handelsname (aus HSN + TSN) laut KBA-Schlüsselverzeichnis.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  if (!dbConfigured()) {
    return res.status(503).json({ code: 'db_not_configured', message: 'Datenbank ist nicht konfiguriert.' });
  }
  const session = await requireAuth(req, res);
  if (!session) return;
  if (await isLimited(session.user?.id || clientIp(req))) {
    return res.status(429).json({ message: 'Zu viele Anfragen. Bitte kurz warten.' });
  }

  const hsn = String(req.query?.hsn || '').trim().toUpperCase();
  const tsn = String(req.query?.tsn || '').trim().toUpperCase();
  if (!HSN_PATTERN.test(hsn) || (tsn && !TSN_PATTERN.test(tsn))) {
    return res.status(400).json({ message: 'Ungültige HSN/TSN.' });
  }

  try {
    return res.status(200).json(await lookupKba(hsn, tsn));
  } catch (error) {
    console.error('KBA lookup error:', error.message);
    // Die Erkennung funktioniert auch ohne das Verzeichnis; der Client zeigt dann nichts an.
    return res.status(502).json({ message: 'Schlüsselverzeichnis derzeit nicht erreichbar' });
  }
}
