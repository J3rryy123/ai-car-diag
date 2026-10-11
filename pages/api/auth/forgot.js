import { authMode, findUserByEmail, issueToken } from '../../../utils/server/auth';
import { mailConfigured, sendResetMail } from '../../../utils/server/mail';
import { sendDbError } from '../../../utils/server/supabase';
import { createRateLimiter, clientIp } from '../../../utils/server/rateLimit';

const tooManyFromIp = createRateLimiter('forgot', 10 * 60 * 1000, 5);
const tooManyForEmail = createRateLimiter('forgot-email', 60 * 60 * 1000, 3);

const REPLY = { ok: true, message: 'Wenn zu dieser E-Mail-Adresse ein Konto existiert, haben wir einen Link zum Zurücksetzen gesendet.' };

// Sendet einen Link zum Zurücksetzen des Passworts. Die Antwort ist immer gleich, damit sich nicht
// herausfinden lässt, welche Adressen registriert sind. Funktioniert für Konten mit hinterlegter E-Mail-Adresse.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!mailConfigured() || (await authMode()) !== 'users') return res.status(404).json({ message: 'Zurücksetzen per E-Mail ist nicht eingerichtet.' });
  if (await tooManyFromIp(clientIp(req))) return res.status(429).json({ message: 'Zu viele Versuche. Bitte später erneut versuchen.' });

  const email = String(req.body?.email ?? '').trim().toLowerCase().slice(0, 200);
  try {
    // Pro Adresse begrenzt, damit niemand fremde Postfächer mit Mails überflutet (Antwort bleibt gleich)
    if (!email || (await tooManyForEmail(email))) return res.status(200).json(REPLY);
    const user = await findUserByEmail(email);
    if (user?.active) {
      try {
        await sendResetMail(user, issueToken('reset', user, 3600), req);
      } catch (error) {
        console.error('Reset-Mail nicht gesendet:', error.message);
      }
    }
    return res.status(200).json(REPLY);
  } catch (error) {
    return sendDbError(res, error);
  }
}
