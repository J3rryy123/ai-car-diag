# KFZ-Diagnose-Plattform

Web-App zur Unterstützung bei der Fahrzeugdiagnose (Next.js).

- **Diagnose**: Fehlerbeschreibung + Fahrzeugdaten (optional per VIN) → KI-gestützte Ursachenanalyse
- **OBD2**: Fehlercode (z. B. `P0301`) dekodieren und analysieren lassen

## Start

```bash
npm install
npm run dev     # http://localhost:3000
```

## Konfiguration

Alle Werte werden als Umgebungsvariablen gesetzt (lokal in `.env.local`, auf Vercel unter *Settings → Environment Variables*). Eine Vorlage steht in `.env.example`.

| Variable | Zweck |
| --- | --- |
| `APP_PASSWORD` | Mit Datenbank: Einrichtungscode für den ersten Administrator (in Produktion zwingend). Ohne Datenbank: gemeinsames Passwort für alle. Ohne beides ist die App offen (nur lokal gedacht). |
| `SESSION_SECRET` | Optional, signiert die Anmeldung (sonst aus `APP_PASSWORD`/Service-Key abgeleitet) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Datenbank für den Diagnoseverlauf |
| `CLAUDE_API_KEY` | Anthropic-Key für die KI-Analyse (sonst Demo-Modus) |
| `CLAUDE_MODEL` | optional, Modell überschreiben |

## Datenbank für den Verlauf (Supabase)

1. Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Im *SQL Editor* den Inhalt von `supabase/schema.sql` ausführen.
3. Unter *Project Settings → API* die Project-URL und den `service_role`-Key kopieren und als `SUPABASE_URL` bzw. `SUPABASE_SERVICE_ROLE_KEY` setzen. Der Key gehört nur auf den Server und darf nie öffentlich werden.
4. `APP_PASSWORD` setzen und neu deployen.

## Benutzerverwaltung

Sobald die Datenbank konfiguriert ist, melden sich Personen mit **Benutzername + Passwort** an (Passwörter werden nur als scrypt-Hash gespeichert).

1. `supabase/schema.sql` (erneut) ausführen – legt die Tabelle `app_users` an und ergänzt `cases.created_by`.
2. Beim ersten Aufruf erscheint die **Ersteinrichtung**: Administrator anlegen. Als Einrichtungscode dient `APP_PASSWORD`.
3. Über den Namen oben rechts (👤) öffnet der Administrator die **Benutzerverwaltung**: Benutzer anlegen, Passwort setzen, Rolle ändern, deaktivieren, löschen. Jeder kann dort sein eigenes Passwort ändern.

Rollen: *Administrator* (inkl. Benutzerverwaltung) und *Mitarbeiter*. Mitarbeiter sehen im Diagnoseverlauf nur ihre eigenen Fälle, Administratoren sehen alle (mit Angabe, wer den Fall angelegt hat). Fälle aus der Zeit vor der Benutzerverwaltung sind nur für Administratoren sichtbar. Ohne Datenbank bleibt es beim gemeinsamen Passwort.

## Abomodell (Selbstregistrierung)

Externe Benutzer können sich selbst ein **kostenpflichtiges Konto** anlegen. Bezahlung, Rechnungen und Kündigung laufen über [Stripe](https://stripe.com) (Checkout + Kundenportal); die App speichert keine Zahlungsdaten.

**Einrichtung**

1. `supabase/schema.sql` (erneut) ausführen – ergänzt `app_users` um E-Mail und Abo-Felder.
2. In Stripe ein **Produkt mit wiederkehrendem Preis** anlegen und die Preis-ID (`price_…`) als `STRIPE_PRICE_ID` setzen. `STRIPE_SECRET_KEY` ist der geheime API-Schlüssel.
3. Unter *Developers → Webhooks* einen Endpunkt `https://<domain>/api/billing/webhook` anlegen mit den Ereignissen `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`; das Signing-Secret (`whsec_…`) als `STRIPE_WEBHOOK_SECRET` setzen.
4. Im Stripe-Dashboard unter *Einstellungen → Kundenportal* das Portal aktivieren (Kündigung, Zahlungsmittel).
5. `APP_URL`, `SUBSCRIPTION_PRICE_LABEL`, `TERMS_URL`, `PRIVACY_URL`, `IMPRINT_URL` setzen und neu deployen. Weitere Optionen: `STRIPE_TRIAL_DAYS`, `STRIPE_AUTOMATIC_TAX`.

**Ablauf**: Auf der Anmeldeseite erscheint „Noch kein Konto? Jetzt registrieren“ → E-Mail, Benutzername, Passwort, Zustimmung → Weiterleitung zu Stripe → nach der Zahlung schaltet der Webhook das Konto frei. Ohne laufendes Abo (`active`, `trialing`, `past_due`) antworten alle Daten-Routen mit 402 und die App zeigt die Bezahlseite. Endet das Abo, ist der Zugang automatisch gesperrt; die Daten bleiben erhalten.

**Konten**: Abonnenten sind immer Rolle *Mitarbeiter* (`account_type = subscriber`) und sehen nur ihre eigenen Fälle – die Daten verschiedener Kunden sind getrennt. Vom Administrator angelegte Konten (`staff`) brauchen kein Abo. In der Benutzerverwaltung sieht der Administrator Abonnenten mit E-Mail und Abo-Status; wird ein Abonnent gelöscht, wird sein Stripe-Abo beendet. Die Registrierung wird erst angeboten, wenn die Ersteinrichtung (erster Administrator) abgeschlossen ist.

**Vor dem Verkauf bitte prüfen** (keine Rechtsberatung): Impressum, Datenschutzerklärung, Nutzungsbedingungen/AGB, Preisangabe inkl. USt., Widerrufsbelehrung bei Verbrauchern, Auftragsverarbeitung mit Anbietern (Stripe, Supabase, Anthropic, Hosting). Die Zustimmung wird mit Zeitstempel in `app_users.terms_accepted_at` gespeichert.

## Begrenzung von Anfragen

KI-Analyse, Fahrzeugschein-Scan, VIN-Abfrage und Anmeldung sind pro Minute begrenzt (je Benutzer bzw. IP), um die API-Schlüssel vor Missbrauch zu schützen. Mit Datenbank zählt die App **zentral** über die Funktion `rate_limit_hit` (Tabelle `rate_limits`), sodass das Limit auch bei mehreren Vercel-Instanzen gilt. Dafür `supabase/schema.sql` (erneut) ausführen. Ist die Funktion noch nicht eingespielt oder die Datenbank nicht erreichbar, zählt die App im Arbeitsspeicher der jeweiligen Instanz weiter (Hinweis „Zentrale Begrenzung nicht verfügbar“ in den Vercel-Logs).

Ohne Datenbank speichert die App den Verlauf lokal im Browser. Sobald die Datenbank konfiguriert ist, lassen sich lokale Fälle im Verlauf-Tab mit einem Klick übernehmen.

## Prüfen

```bash
npm run lint
npm run build
```
