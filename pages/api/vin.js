import { requireAuth } from '../../utils/server/auth';
import { clientIp, createLimiter } from '../../utils/server/rateLimit';
import { lookupVin } from '../../utils/server/vinLookup';
import VIN_DECODER from '../../utils/vinDecoder';

const isLimited = createLimiter(60 * 1000, 30);

// Ergänzt die lokale VIN-Auswertung um Modell-/Motordaten aus einer externen Datenbank.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!(await requireAuth(req, res))) return;
  if (isLimited(clientIp(req))) {
    return res.status(429).json({ message: 'Zu viele Anfragen. Bitte kurz warten.' });
  }

  const vin = VIN_DECODER.cleanVIN(req.body?.vin);
  if (!VIN_DECODER.isVinFormat(vin)) {
    return res.status(400).json({ message: 'Ungültige VIN' });
  }

  try {
    const { found, data } = await lookupVin(vin);
    return res.status(200).json({ found, data });
  } catch (error) {
    console.error('VIN lookup error:', error.message);
    // Die lokale Erkennung funktioniert weiterhin; der Client zeigt nur einen Hinweis.
    return res.status(502).json({ message: 'Fahrzeugdatenbank derzeit nicht erreichbar' });
  }
}
