import {
  authMode, adminExists, hashPassword, passwordProblem, sessionCookie, publicUser,
  findUserByName, findUserByEmail, issueToken, USERNAME_PATTERN, EMAIL_PATTERN
} from '../../../utils/server/auth';
import { db, sendDbError } from '../../../utils/server/supabase';
import { billingConfigured, createCheckoutUrl } from '../../../utils/server/billing';
import { mailConfigured, sendVerificationMail } from '../../../utils/server/mail';
import { createRateLimiter, clientIp } from '../../../utils/server/rateLimit';

const tooManyAttempts = createRateLimiter('register', 10 * 60 * 1000, 5);

// Selbstregistrierung eines externen Benutzers (Abo-Konto). Das Konto wird angelegt und angemeldet,
// bleibt aber ohne Zugriff, bis Stripe ein laufendes Abo meldet.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!billingConfigured() || (await authMode()) !== 'users') {
    return res.status(404).json({ message: 'Die Registrierung ist nicht aktiviert.' });
  }
  if (await tooManyAttempts(clientIp(req))) return res.status(429).json({ message: 'Zu viele Versuche. Bitte später erneut versuchen.' });

  const email = String(req.body?.email ?? '').trim().toLowerCase().slice(0, 200);
  const username = String(req.body?.username ?? '').trim().toLowerCase();
  const displayName = String(req.body?.displayName ?? '').trim().slice(0, 100) || username;
  const password = req.body?.password;

  if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ message: 'Bitte eine gültige E-Mail-Adresse angeben.' });
  if (!USERNAME_PATTERN.test(username)) {
    return res.status(400).json({ message: 'Benutzername: 3–32 Zeichen (a–z, 0–9, Punkt, Unterstrich, Bindestrich).' });
  }
  const problem = passwordProblem(password);
  if (problem) return res.status(400).json({ message: problem });
  if (req.body?.acceptTerms !== true) {
    return res.status(400).json({ message: 'Bitte die Nutzungsbedingungen und die Datenschutzerklärung akzeptieren.' });
  }

  try {
    // Ohne Administrator muss zuerst die Ersteinrichtung erfolgen, sonst würde dieses Konto sie blockieren
    if (!(await adminExists())) return res.status(409).json({ message: 'Die Plattform ist noch nicht eingerichtet.' });
    if (await findUserByName(username)) return res.status(409).json({ message: 'Benutzername ist bereits vergeben.' });
    const existing = await findUserByEmail(email);
    if (existing) {
      // Ein nie bestätigtes, unbezahltes Konto darf eine Adresse nicht dauerhaft blockieren (z. B. fremde Anmeldung mit deiner Adresse)
      const abandoned = mailConfigured() && existing.account_type === 'subscriber' && !existing.email_verified_at && existing.subscription_status === 'incomplete';
      if (!abandoned) return res.status(409).json({ message: 'Zu dieser E-Mail-Adresse gibt es bereits ein Konto. Bitte anmelden.' });
      await db(`app_users?id=eq.${existing.id}`, { method: 'DELETE' });
    }

    const [user] = await db('app_users', {
      method: 'POST',
      body: {
        username,
        email,
        display_name: displayName,
        password_hash: await hashPassword(password),
        role: 'user',
        account_type: 'subscriber',
        subscription_status: 'incomplete',
        terms_accepted_at: new Date().toISOString()
      },
      prefer: 'return=representation'
    });
    res.setHeader('Set-Cookie', sessionCookie(user));

    // Mit Mail-Dienst muss die Adresse erst bestätigt werden, dann folgt die Bezahlung
    if (mailConfigured()) {
      let verificationSent = true;
      try {
        await sendVerificationMail(user, issueToken('verify', user, 24 * 3600), req);
      } catch (error) {
        verificationSent = false; // Das Konto besteht; „erneut senden“ ist nach der Anmeldung möglich
      }
      return res.status(201).json({ ok: true, user: publicUser(user), checkoutUrl: null, verificationRequired: true, verificationSent });
    }

    // Schlägt Stripe fehl, ist das Konto trotzdem angelegt; die Bezahlung lässt sich nach der Anmeldung neu starten
    let checkoutUrl = null;
    try {
      checkoutUrl = await createCheckoutUrl(user, req);
    } catch (error) {
      console.error('Checkout nach Registrierung nicht möglich:', error.message);
    }
    return res.status(201).json({ ok: true, user: publicUser(user), checkoutUrl });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'Benutzername oder E-Mail-Adresse ist bereits vergeben.' });
    return sendDbError(res, error);
  }
}
