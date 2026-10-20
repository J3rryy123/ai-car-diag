// Importiert das KBA-Schlüsselverzeichnis (FZ 6.1) in die Supabase-Tabelle kba_types.
// Aufruf:  node --env-file=.env.local scripts/import-kba.mjs <fz6.xlsx> [--stand JJJJ-MM-TT] [--dry-run]
// Benötigt SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY. Vorhandene Einträge werden aktualisiert, neue ergänzt;
// nicht mehr gelistete Typen bleiben erhalten (ältere Fahrzeuge sind weiter auf der Straße).
import readXlsxFile from 'read-excel-file/node';
import { parseFz6, parseStand } from './kbaParse.mjs';

const BATCH = 1000;
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const standIndex = args.indexOf('--stand');
const standArg = standIndex >= 0 ? args[standIndex + 1] : null;
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--stand');

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!file) fail('Aufruf: node --env-file=.env.local scripts/import-kba.mjs <fz6.xlsx> [--stand JJJJ-MM-TT] [--dry-run]');
if (standArg && !/^\d{4}-\d{2}-\d{2}$/.test(standArg)) fail('--stand muss im Format JJJJ-MM-TT angegeben werden.');

const sheets = await readXlsxFile(file, { getSheets: true });
const sheet = sheets.find((s) => /^FZ\s*6\.1$/i.test(s.name));
if (!sheet) fail(`Tabellenblatt "FZ 6.1" nicht gefunden (vorhanden: ${sheets.map((s) => s.name).join(', ')}).`);

const { entries, stand: parsedStand } = parseFz6(await readXlsxFile(file, { sheet: sheet.name }));
const stand = standArg || parsedStand;
if (!entries.length) fail('Keine Daten erkannt. Ist das die KBA-Datei FZ 6 (Bestand nach Herstellern und Typen)?');
if (!stand) fail('Stichtag nicht erkannt. Bitte mit --stand JJJJ-MM-TT angeben.');

const hsnCount = new Set(entries.map((e) => e.hsn)).size;
console.log(`${entries.length} Typen von ${hsnCount} Herstellerschlüsselnummern, Stand ${stand}.`);
if (dryRun) {
  console.log('Probelauf: nichts geschrieben.');
  process.exit(0);
}

const url = process.env.SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) fail('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.');

for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH).map((e) => ({ ...e, stand }));
  const response = await fetch(`${url}/rest/v1/kba_types?on_conflict=hsn,tsn`, {
    method: 'POST',
    headers: {
      apikey: key,
      // Neue "Secret keys" (sb_secret_…) sind keine JWTs und dürfen nicht als Bearer-Token gesendet werden
      ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(batch)
  });
  if (!response.ok) {
    const detail = await response.text();
    fail(`Fehler bei Zeile ${i + 1}–${i + batch.length}: HTTP ${response.status} ${detail.slice(0, 300)}\nTabelle kba_types vorhanden? supabase/schema.sql ausführen.`);
  }
  process.stdout.write(`\r${Math.min(i + BATCH, entries.length)} / ${entries.length}`);
}
console.log('\nFertig.');
