import { describe, expect, it } from 'vitest';
import { createLimiter } from '../utils/server/rateLimit';
import { fromRow, isScoped, ownOnly, toRow } from '../utils/server/caseMapping';

describe('createLimiter', () => {
  it('sperrt nach Überschreiten des Limits, getrennt je Schlüssel', () => {
    const limited = createLimiter(60_000, 3);
    expect([1, 2, 3].map(() => limited('a'))).toEqual([false, false, false]);
    expect(limited('a')).toBe(true);
    expect(limited('b')).toBe(false);
  });
});

describe('caseMapping', () => {
  it('erkennt, wer nur eigene Fälle sieht', () => {
    expect(isScoped({ user: { id: '1', role: 'mechanic' } })).toBe(true);
    expect(isScoped({ user: { id: '1', role: 'admin' } })).toBe(false);
    expect(isScoped({ user: null })).toBe(false);
    expect(ownOnly({ user: { id: 'u1', role: 'mechanic' } })).toBe('&created_by_id=eq.u1');
    expect(ownOnly({ user: null })).toBe('');
  });

  it('wandelt Fall ↔ Tabellenzeile um, ohne Daten zu verlieren', () => {
    const row = toRow({
      type: 'diagnose',
      vehicle: 'VW Golf',
      vin: 'WVWZZZ1KZ6W612345',
      problem: 'ruckelt',
      carDetails: { make: 'VW', registration: { hsn: '0603' } },
      result: { diagnosis: 'x' },
    });
    expect(row.vehicle).toBe('VW Golf');
    expect(row.data.carDetails.registration.hsn).toBe('0603');
    const flat = fromRow({ ...row, id: 'id1', created_at: '2026-01-01T00:00:00Z', created_by: 'Jerry' });
    expect(flat.carDetails.registration.hsn).toBe('0603');
    expect(flat.type).toBe('diagnose');
    expect(flat.createdBy).toBe('Jerry');
  });

  it('lehnt unbekannte Fall-Typen und zu große Fälle ab', () => {
    expect(toRow({ type: 'unbekannt' })).toBeNull();
    expect(toRow(null)).toBeNull();
    expect(toRow({ type: 'diagnose', result: 'x'.repeat(300 * 1024) })).toBeNull();
  });
});
