import { appUrl } from './billing';

// Transaktions-E-Mails (Bestätigung, Passwort zurücksetzen) über Resend (REST-API, keine Abhängigkeit).
// Aktiv, sobald RESEND_API_KEY und MAIL_FROM (z. B. "Smart Repair <noreply@deine-domain.de>") gesetzt sind.
// Ohne Mail-Dienst entfallen Bestätigung und „Passwort vergessen“, alles andere läuft wie bisher.
export const mailConfigured = () => !!(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());

export class MailError extends Error {}

export async function sendMail({ to, subject, text }) {
  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM.trim(), to: [to], subject, text }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    console.error('Mail-Dienst nicht erreichbar:', error.message);
    throw new MailError('E-Mail konnte nicht gesendet werden.');
  }
  if (!response.ok) {
    console.error('Mail-Fehler:', response.status, (await response.text().catch(() => '')).slice(0, 300));
    throw new MailError('E-Mail konnte nicht gesendet werden.');
  }
}

const greeting = (user) => `Hallo ${user.display_name || user.username},`;

export const sendVerificationMail = (user, token, req) =>
  sendMail({
    to: user.email,
    subject: 'Bitte bestätige deine E-Mail-Adresse',
    text: `${greeting(user)}\n\nbitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren:\n\n${appUrl(req)}/?verify=${token}\n\nDer Link ist 24 Stunden gültig. Wenn du dich nicht registriert hast, kannst du diese E-Mail ignorieren.`
  });

export const sendResetMail = (user, token, req) =>
  sendMail({
    to: user.email,
    subject: 'Passwort zurücksetzen',
    text: `${greeting(user)}\n\nüber diesen Link kannst du ein neues Passwort festlegen:\n\n${appUrl(req)}/?reset=${token}\n\nDer Link ist 1 Stunde gültig und funktioniert nur einmal. Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren – dein Passwort bleibt unverändert.`
  });
