# KFZ-Diagnose-Plattform

Web-App zur Unterstützung bei der Fahrzeugdiagnose (Next.js).

- **Diagnose**: Fehlerbeschreibung + Fahrzeugdaten (optional per VIN) → KI-gestützte Ursachenanalyse
- **OBD2**: Fehlercode (z. B. `P0301`) dekodieren und analysieren lassen

## Start

```bash
npm install
npm run dev     # http://localhost:3000
```

## Konfiguration (`.env.local`)

| Variable | Zweck |
| --- | --- |
| `CLAUDE_API_KEY` | Anthropic-Key für die Claude-Analyse |
| `OPENAI_API_KEY` | OpenAI-Key für die ChatGPT-Analyse |
| `CLAUDE_MODEL` / `OPENAI_MODEL` | optional, Modell überschreiben |

Ohne Keys läuft die App im Demo-Modus mit vorgefertigten Antworten.
