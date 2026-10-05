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

## Begrenzung von Anfragen

KI-Analyse, Fahrzeugschein-Scan, VIN-Abfrage und Anmeldung sind pro Minute begrenzt (je Benutzer bzw. IP), um die API-Schlüssel vor Missbrauch zu schützen. Mit Datenbank zählt die App **zentral** über die Funktion `rate_limit_hit` (Tabelle `rate_limits`), sodass das Limit auch bei mehreren Vercel-Instanzen gilt. Dafür `supabase/schema.sql` (erneut) ausführen. Ist die Funktion noch nicht eingespielt oder die Datenbank nicht erreichbar, zählt die App im Arbeitsspeicher der jeweiligen Instanz weiter (Hinweis „Zentrale Begrenzung nicht verfügbar“ in den Vercel-Logs).

Ohne Datenbank speichert die App den Verlauf lokal im Browser. Sobald die Datenbank konfiguriert ist, lassen sich lokale Fälle im Verlauf-Tab mit einem Klick übernehmen.

## Prüfen

```bash
npm run lint
npm run build
```
