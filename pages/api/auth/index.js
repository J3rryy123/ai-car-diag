import {
  authMode, getSession, passwordMatches, sessionCookie, clearCookie, findUserByName, verifyPassword, publicUser, countUsers
} from '../../../utils/server/auth';
import { billingConfigured, billingInfo } from '../../../utils/server/billing';
import { sendDbError } from '../../../utils/server/supabase';
import { createRateLimiter, clientIp } from '../../../utils/server/rateLimit';

const tooManyAttempts = createRateLimiter('login', 60 * 1000, 5);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const session = await getSession(req);
      const setupRequired = session.mode === 'users' && !session.authenticated && (await countUsers()) === 0;
      // Registrierung nur anbieten, wenn Stripe eingerichtet ist und die Ersteinrichtung abgeschlossen wurde
      const billing = session.mode === 'users' && billingConfigured();
      return res.status(200).json({
        mode: session.mode,
        authRequired: session.mode !== 'open',
        authenticated: session.authenticated,
        setupRequired,
        signupEnabled: billing && !session.authenticated && !setupRequired,
        billing: billing ? billingInfo() : null,
        user: session.user ? publicUser(session.user) : null
      });
    }

    if (req.method === 'DELETE') {
      res.setHeader('Set-Cookie', clearCookie());
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST') {
      const mode = await authMode();
      if (mode === 'open') return res.status(200).json({ ok: true });
      if (await tooManyAttempts(clientIp(req))) return res.status(429).json({ message: 'Zu viele Versuche. Bitte kurz warten.' });

      if (mode === 'legacy') {
        if (!passwordMatches(req.body?.password ?? '')) return res.status(401).json({ message: 'Passwort falsch.' });
        res.setHeader('Set-Cookie', sessionCookie());
        return res.status(200).json({ ok: true });
      }

      const username = String(req.body?.username ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      const user = await findUserByName(username);
      const valid = await verifyPassword(password, user?.password_hash);
      if (!user || !valid || !user.active) return res.status(401).json({ message: 'Benutzername oder Passwort falsch.' });
      res.setHeader('Set-Cookie', sessionCookie(user));
      return res.status(200).json({ ok: true, user: publicUser(user) });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    return sendDbError(res, error);
  }
}
