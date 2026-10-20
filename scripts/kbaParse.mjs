// Liest die KBA-Statistik FZ 6.1 ("Bestand an Kraftfahrzeugen und Kraftfahrzeuganhängern nach Herstellern und Typen").
// rows: Zeilen des Tabellenblatts "FZ 6.1" (Spalten: -, HSN, Herstellerklartext, TSN, Handelsname, Anzahl).
const MONTHS = { januar: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };

const cell = (value) => (value === null || value === undefined ? '' : String(value).trim());

// "… am 1. Januar 2024" -> "2024-01-01" (aus Überschrift oder Deckblatt)
export function parseStand(text) {
  const match = /(\d{1,2})\.\s*([A-Za-zäöüÄÖÜ]+)\s+(\d{4})/.exec(String(text || ''));
  const month = match && MONTHS[match[2].toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${String(month).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`;
}

export function parseFz6(rows) {
  const entries = [];
  let stand = null;
  for (const row of rows) {
    const hsn = cell(row[1]).toUpperCase();
    const tsn = cell(row[3]).toUpperCase();
    if (/^[0-9A-Z]{4}$/.test(hsn) && /^[0-9A-Z]{3}$/.test(tsn) && cell(row[2])) {
      const stock = Number(String(row[5] ?? '').replace(/[.,]/g, ''));
      entries.push({
        hsn,
        tsn,
        manufacturer: cell(row[2]).slice(0, 100),
        trade_name: cell(row[4]).slice(0, 200),
        stock: Number.isFinite(stock) ? Math.round(stock) : 0
      });
    } else if (!stand && /Bestand an Kraftfahrzeugen.* am /.test(cell(row[1]))) {
      stand = parseStand(cell(row[1]));
    }
  }
  return { entries, stand };
}
