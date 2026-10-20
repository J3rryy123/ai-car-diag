import { describe, expect, it } from 'vitest';
import { parseFz6, parseStand } from '../scripts/kbaParse.mjs';

const rows = [
  [null, null, null, null, null, null],
  [null, 'zurück zum Inhaltsverzeichnis', null, null, null, null],
  [null, 'FZ 6.1 Bestand an Kraftfahrzeugen und Kraftfahrzeuganhängern nach Herstellern und Typen am 1. Januar 2024', null, null, null, null],
  [null, 'Hersteller-\nschlüssel-\nnummer', 'Herstellerklartext', 'Typ-\nschlüssel-\nnummer', 'Handelsname', 'Anzahl'],
  [null, '0603', 'VOLKSWAGEN-VW', 'BKW', 'BEETLE', 412],
  [null, '0001', 'ADLERWERKE', '096', 'M 100', '1,234'],
  [null, '8004', 'SKODA (CZ)', 'aaa', ' OCTAVIA ', 7],
  [null, '12', 'ZU KURZ', '001', 'x', 1],
  [null, '0603', '', 'BKX', 'ohne Hersteller', 1],
  [null, '© Kraftfahrt-Bundesamt, Flensburg', null, null, null, null],
];

describe('KBA FZ 6.1 einlesen', () => {
  it('liest nur gültige Datenzeilen und den Stichtag', () => {
    const { entries, stand } = parseFz6(rows);
    expect(stand).toBe('2024-01-01');
    expect(entries.map((e) => `${e.hsn}/${e.tsn}`)).toEqual(['0603/BKW', '0001/096', '8004/AAA']);
    expect(entries[0]).toEqual({ hsn: '0603', tsn: 'BKW', manufacturer: 'VOLKSWAGEN-VW', trade_name: 'BEETLE', stock: 412 });
  });

  it('bereinigt Texte und Tausendertrennzeichen in der Anzahl', () => {
    const { entries } = parseFz6(rows);
    expect(entries[1].stock).toBe(1234);
    expect(entries[2].trade_name).toBe('OCTAVIA');
  });

  it('liefert ohne Daten leere Ergebnisse', () => {
    expect(parseFz6([])).toEqual({ entries: [], stand: null });
  });
});

describe('Stichtag erkennen', () => {
  it('wandelt deutsche Datumsangaben um', () => {
    expect(parseStand('Bestand am 1. Januar 2024')).toBe('2024-01-01');
    expect(parseStand('Stand 31. März 2025')).toBe('2025-03-31');
    expect(parseStand('kein Datum')).toBeNull();
  });
});
