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
| `APP_PASSWORD` | Gemeinsames Passwort für den Zugriff. In Produktion zwingend setzen, sonst bleibt der Verlauf gesperrt. Ohne Passwort ist die App offen (nur lokal gedacht). |
| `SESSION_SECRET` | Optional, signiert die Anmeldung (sonst aus `APP_PASSWORD` abgeleitet) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Datenbank für den Diagnoseverlauf |
| `CLAUDE_API_KEY` / `OPENAI_API_KEY` | KI-Analyse (sonst Demo-Modus) |
| `CLAUDE_MODEL` / `OPENAI_MODEL` | optional, Modell überschreiben |

## Datenbank für den Verlauf (Supabase)

1. Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Im *SQL Editor* den Inhalt von `supabase/schema.sql` ausführen.
3. Unter *Project Settings → API* die Project-URL und den `service_role`-Key kopieren und als `SUPABASE_URL` bzw. `SUPABASE_SERVICE_ROLE_KEY` setzen. Der Key gehört nur auf den Server und darf nie öffentlich werden.
4. `APP_PASSWORD` setzen und neu deployen.

Ohne Datenbank speichert die App den Verlauf lokal im Browser. Sobald die Datenbank konfiguriert ist, lassen sich lokale Fälle im Verlauf-Tab mit einem Klick übernehmen.

## Prüfen

```bash
npm run lint
npm run build
```
