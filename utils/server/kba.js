// Nachschlagen im KBA-Schlüsselverzeichnis (Tabelle kba_types): HSN -> Hersteller, HSN+TSN -> Handelsname.
// Quelle: © Kraftfahrt-Bundesamt, Flensburg, Datenlizenz Deutschland – Namensnennung – Version 2.0.
import { db, dbConfigured } from './supabase';

const HSN_PATTERN = /^[0-9A-Z]{4}$/;
const TSN_PATTERN = /^[0-9A-Z]{3}$/;

// Herstellerklartext des KBA ("FORD (D)", "VOLKSWAGEN-VW") in die übliche Markenschreibweise bringen
const MAKE_RULES = [
  [/^VOLKSWAGEN-VW\b/, 'VW'],
  [/^BAYER\.MOT\.WERKE-BMW\b/, 'BMW'],
  [/^(DAIMLER|DAIMLERCHRYSLER|MERCEDES-BENZ)\b/, 'Mercedes-Benz'],
  [/^OPEL\b/, 'Opel'],
  [/^TOYOTA\b/, 'Toyota'],
  [/^HYUNDAI\b/, 'Hyundai'],
  [/^KIA\b/, 'Kia'],
  [/^HONDA\b/, 'Honda']
];
const titleCase = (text) => text.toLowerCase().replace(/(^|[\s-])([a-zäöü])/g, (m, sep, ch) => sep + ch.toUpperCase());

export function displayMake(manufacturer) {
  const base = String(manufacturer || '').replace(/\s*\([A-Z]{1,3}\)\s*$/, '').trim();
  if (!base) return '';
  const rule = MAKE_RULES.find(([pattern]) => pattern.test(base));
  return rule ? rule[1] : titleCase(base);
}

// Für das Modellfeld nur eindeutige Einzelbezeichnungen ("BEETLE"), keine Sammeleinträge ("LT 35 Z;LT 40")
export function singleModel(tradeName) {
  const name = String(tradeName || '').trim();
  if (!name || /^UNBEKANNT$/i.test(name) || /[;,]/.test(name)) return '';
  return name;
}

/**
 * Liefert { found, hsn, tsn, manufacturer, make, tradeName, model, tsnFound, stand } oder { found: false }.
 * Ohne Datenbank oder bei ungültiger HSN wird nichts gefunden. Datenbankfehler werden weitergereicht.
 */
export async function lookupKba(hsn, tsn) {
  if (!dbConfigured() || !HSN_PATTERN.test(hsn || '')) return { found: false };
  if (tsn && TSN_PATTERN.test(tsn)) {
    const [row] = await db(`kba_types?select=manufacturer,trade_name,stand&hsn=eq.${hsn}&tsn=eq.${tsn}&limit=1`);
    if (row) return result(hsn, tsn, row, true);
  }
  const [row] = await db(`kba_types?select=manufacturer,stand&hsn=eq.${hsn}&limit=1`);
  return row ? result(hsn, tsn, row, false) : { found: false };
}

function result(hsn, tsn, row, tsnFound) {
  const tradeName = tsnFound ? row.trade_name || '' : '';
  return {
    found: true,
    hsn,
    tsn: tsnFound ? tsn : null,
    manufacturer: row.manufacturer,
    make: displayMake(row.manufacturer),
    tsnFound,
    tradeName: /^UNBEKANNT$/i.test(tradeName) ? '' : tradeName,
    model: tsnFound ? singleModel(row.trade_name) : '',
    stand: row.stand || null
  };
}
