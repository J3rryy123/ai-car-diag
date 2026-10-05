import { requireAuth } from '../../utils/server/auth';
import { callClaude } from '../../utils/server/claude';
import { clientIp, createRateLimiter } from '../../utils/server/rateLimit';
import { REGISTRATION_PROMPT, REGISTRATION_TOOL, normalizeRegistration } from '../../utils/server/registrationParse';

// Fotos werden im Browser verkleinert; Vercel erlaubt höchstens 4,5 MB pro Anfrage
export const config = { api: { bodyParser: { sizeLimit: '4mb' } }, maxDuration: 60 };

const MAX_BASE64_CHARS = 4_000_000;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const isLimited = createRateLimiter('scan', 60 * 1000, 10);

// Liest Fahrzeugdaten aus einem Foto des Fahrzeugscheins. Das Bild wird nicht gespeichert.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const session = await requireAuth(req, res);
  if (!session) return;
  if (await isLimited(session.user?.id || clientIp(req))) {
    return res.status(429).json({ message: 'Zu viele Anfragen. Bitte kurz warten.' });
  }
  if (!process.env.CLAUDE_API_KEY) {
    return res.status(503).json({ message: 'Der KI-Zugang (CLAUDE_API_KEY) ist nicht eingerichtet.' });
  }

  const match = typeof req.body?.image === 'string' ? DATA_URL.exec(req.body.image) : null;
  if (!match) {
    return res.status(400).json({ message: 'Bitte ein Foto (JPEG, PNG oder WebP) senden.' });
  }
  if (match[2].length > MAX_BASE64_CHARS) {
    return res.status(413).json({ message: 'Das Foto ist zu groß.' });
  }

  try {
    const { toolInput } = await callClaude(
      [
        { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } },
        { type: 'text', text: REGISTRATION_PROMPT },
      ],
      REGISTRATION_TOOL
    );
    if (!toolInput || toolInput.isRegistrationDocument === false) {
      return res.status(422).json({ message: 'Auf dem Foto wurde kein Fahrzeugschein erkannt. Bitte neu aufnehmen.' });
    }
    const { fields, warnings } = normalizeRegistration(toolInput);
    if (!Object.keys(fields).length) {
      return res.status(422).json({ message: 'Es konnten keine Daten gelesen werden. Bitte näher und gerade fotografieren.' });
    }
    return res.status(200).json({ fields, warnings });
  } catch (error) {
    console.error('Registration scan error:', error.message);
    return res.status(502).json({ message: `Fahrzeugschein konnte nicht ausgewertet werden (${error.message}).` });
  }
}
