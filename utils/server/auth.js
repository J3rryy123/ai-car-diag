import crypto from 'crypto';
import { db, dbConfigured } from './supabase';

// Zugriffsschutz mit Cookie-Sitzung. Drei Modi:
//  - 'users':  Datenbank konfiguriert → Benutzerverwaltung (Tabelle app_users, Anmeldung mit Benutzername + Passwort)
//  - 'legacy': keine Datenbank, aber APP_PASSWORD → gemeinsames Passwort
//  - 'open':   weder noch → App offen (nur lokal/Demo)
const COOKIE_NAME = 'kfz_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
export const MIN_PASSWORD_LENGTH = 8;

// Solange die Tabelle app_users fehlt (Schema noch nicht eingespielt), bleibt das gemeinsame Passwort aktiv,
// damit sich bestehende Installationen nicht aussperren.
const MISSING_TABLE_CODES = ['PGRST205', '42P01'];
const RECHECK_MS = 30 * 1000;
let usersTable = { ok: false, missingAt: 0 };

export async function authMode() {
  if (!dbConfigured()) return process.env.APP_PASSWORD ? 'legacy' : 'open';
  if (usersTable.ok) return 'users';
  const fallback = process.env.APP_PASSWORD ? 'legacy' : 'users';
  if (Date.now() - usersTable.missingAt < RECHECK_MS) return fallback;
  try {
    await db('app_users?select=id&limit=1');
    usersTable = { ok: true, missingAt: 0 };
  } catch (error) {
    if (!MISSING_TABLE_CODES.includes(error.code)) return 'users'; // andere Fehler werden von den Routen gemeldet
    usersTable = { ok: false, missingAt: Date.now() };
    return fallback;
  }
  return 'users';
}

const secret = () =>
  process.env.SESSION_SECRET ||
  `kfz-session:${process.env.APP_PASSWORD || ''}:${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`;
const sign = (value) => crypto.createHmac('sha256', secret()).update(value).digest('hex');
const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// --- Passwörter ------------------------------------------------------------
const scrypt = (password, salt) =>
  new Promise((resolve, reject) =>
    crypto.scrypt(String(password), salt, 64, (error, key) => (error ? reject(error) : resolve(key)))
  );

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return `s1$${salt.toString('hex')}$${(await scrypt(password, salt)).toString('hex')}`;
}

const DUMMY_HASH = hashPassword('dummy-password');

export async function verifyPassword(password, stored) {
  const [version, saltHex, hashHex] = String(stored || '').split('$');
  if (version !== 's1' || !saltHex || !hashHex) {
    // Gleiche Rechenzeit wie bei einem echten Hash, damit unbekannte Benutzer nicht erkennbar sind
    await verifyPassword(password, await DUMMY_HASH).catch(() => {});
    return false;
  }
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'));
  const expected = Buffer.from(hashHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export const passwordMatches = (input) =>
  !!process.env.APP_PASSWORD && safeEqual(sha256(input), sha256(process.env.APP_PASSWORD));

export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  if (password.length > 200) return 'Das Passwort ist zu lang.';
  return null;
}

// --- Benutzer --------------------------------------------------------------
// Mitarbeiter (vom Administrator angelegt) haben immer Zugriff; Abo-Konten (Selbstregistrierung) nur mit laufendem Abo.
// „past_due“ (Zahlung fehlgeschlagen) bleibt als Kulanzzeit freigeschaltet, bis Stripe das Abo beendet.
const ACTIVE_SUBSCRIPTION = ['active', 'trialing', 'past_due'];
export const hasAccess = (u) => (u.account_type || 'staff') !== 'subscriber' || ACTIVE_SUBSCRIPTION.includes(u.subscription_status);

export const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  displayName: u.display_name || u.username,
  email: u.email || '',
  role: u.role,
  active: u.active,
  createdAt: u.created_at,
  accountType: u.account_type || 'staff',
  subscriptionStatus: u.subscription_status || 'none',
  hasAccess: hasAccess(u),
  currentPeriodEnd: u.current_period_end || null,
  cancelAtPeriodEnd: !!u.cancel_at_period_end
});

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function findUserByName(username) {
  if (!USERNAME_PATTERN.test(username)) return null;
  const rows = await db(`app_users?username=eq.${username}&select=*&limit=1`);
  return rows[0] || null;
}

async function findUserById(id) {
  if (!UUID.test(id)) return null;
  const rows = await db(`app_users?id=eq.${id}&select=*&limit=1`);
  return rows[0] || null;
}

export const countUsers = async () => (await db('app_users?select=id&limit=1')).length;
export const adminExists = async () => (await db('app_users?role=eq.admin&select=id&limit=1')).length > 0;

export async function findUserByEmail(email) {
  if (!EMAIL_PATTERN.test(email)) return null;
  const rows = await db(`app_users?email=eq.${encodeURIComponent(email)}&select=*&limit=1`);
  return rows[0] || null;
}

// --- Sitzung ---------------------------------------------------------------
// Cookie: <Benutzer-ID | legacy>.<Ablauf>.<Signatur>. Die Signatur enthält einen Fingerabdruck des
// Passwort-Hashs, sodass eine Passwortänderung alle bestehenden Sitzungen ungültig macht.
const fingerprint = (user) => sha256(user.password_hash).slice(0, 16);
const cookieAttributes = () => `HttpOnly; SameSite=Strict; Path=/${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

export function sessionCookie(user) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const subject = user ? user.id : 'legacy';
  const signature = sign(`${subject}.${expires}.${user ? fingerprint(user) : ''}`);
  return `${COOKIE_NAME}=${subject}.${expires}.${signature}; ${cookieAttributes()}; Max-Age=${SESSION_SECONDS}`;
}

export const clearCookie = () => `${COOKIE_NAME}=; ${cookieAttributes()}; Max-Age=0`;

/** Liefert { mode, authenticated, user } – user ist nur im Modus 'users' gesetzt. */
export async function getSession(req) {
  const mode = await authMode();
  if (mode === 'open') return { mode, authenticated: true, user: null };

  const cookie = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE_NAME}=`));
  const [subject, expires, signature] = cookie ? cookie.slice(COOKIE_NAME.length + 1).split('.') : [];
  const none = { mode, authenticated: false, user: null };
  if (!subject || !expires || !signature || Number(expires) < Date.now() / 1000) return none;

  if (mode === 'legacy') {
    return subject === 'legacy' && safeEqual(signature, sign(`legacy.${expires}.`)) ? { mode, authenticated: true, user: null } : none;
  }

  let user;
  try {
    user = await findUserById(subject);
  } catch (error) {
    console.error('Sitzung konnte nicht geprüft werden:', error.message);
    return none;
  }
  if (!user || !user.active || !safeEqual(signature, sign(`${user.id}.${expires}.${fingerprint(user)}`))) return none;
  return { mode, authenticated: true, user };
}

/**
 * Prüft den Zugriff. Antwortet bei Ablehnung selbst und liefert die Sitzung bzw. null zurück.
 * Ohne Passwort/Datenbank ist die App offen (nur lokal/Demo); `strict` verlangt in Produktion zwingend einen Schutz.
 * `admin` verlangt zusätzlich die Rolle „admin“. Abo-Konten ohne laufendes Abo werden mit 402 abgewiesen,
 * außer die Route setzt `allowUnpaid` (Anmeldestatus, Passwort, Bezahlvorgang).
 */
export async function requireAuth(req, res, { strict = false, admin = false, allowUnpaid = false } = {}) {
  const session = await getSession(req);
  if (session.mode === 'open') {
    if ((strict || admin) && process.env.NODE_ENV === 'production') {
      res.status(503).json({ code: 'auth_not_configured', message: 'Weder Datenbank noch APP_PASSWORD sind gesetzt.' });
      return null;
    }
    if (admin) {
      res.status(403).json({ message: 'Benutzerverwaltung benötigt die Datenbank.' });
      return null;
    }
    return session;
  }
  if (!session.authenticated) {
    res.status(401).json({ code: 'unauthorized', message: 'Bitte anmelden.' });
    return null;
  }
  if (admin && session.user?.role !== 'admin') {
    res.status(403).json({ message: 'Nur für Administratoren.' });
    return null;
  }
  if (!allowUnpaid && session.user && !hasAccess(session.user)) {
    res.status(402).json({ code: 'subscription_required', message: 'Für dieses Konto ist kein aktives Abonnement vorhanden.' });
    return null;
  }
  return session;
}
