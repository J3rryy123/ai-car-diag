import React from 'react';
import { cleanHsn, cleanTsn, HSN_PATTERN, TSN_PATTERN, withHsnTsn } from '../utils/hsnTsn';

// Eingabe von HSN (Feld 2.1) und TSN (Feld 2.2) aus dem Fahrzeugschein zur genaueren Fahrzeugerkennung.
// registration: Fahrzeugschein-Daten (Scan oder manuelle Eingabe); onChange(registration) liefert die aktualisierten Daten.
export default function HsnTsnFields({ registration, onChange, styles }) {
  const hsn = registration?.hsn || '';
  const tsn = registration?.tsn || '';
  const hsnBad = hsn.length > 0 && !HSN_PATTERN.test(hsn);
  const tsnBad = tsn.length > 0 && !TSN_PATTERN.test(tsn);
  const hint = (hsn || tsn) && !(HSN_PATTERN.test(hsn) && TSN_PATTERN.test(tsn))
    ? 'HSN (4 Zeichen) und TSN (3 Zeichen) werden erst vollständig für die Analyse verwendet.'
    : null;

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div className={styles.carDetailsGrid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            HSN <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>(Feld 2.1)</span>
          </label>
          <input
            type="text"
            value={hsn}
            onChange={(e) => onChange(withHsnTsn(registration, cleanHsn(e.target.value), tsn))}
            className={styles.input}
            style={hsnBad ? { borderColor: '#f59e0b' } : undefined}
            placeholder="z.B. 0603"
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Herstellerschlüsselnummer (HSN)"
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            TSN <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>(Feld 2.2)</span>
          </label>
          <input
            type="text"
            value={tsn}
            onChange={(e) => onChange(withHsnTsn(registration, hsn, cleanTsn(e.target.value)))}
            className={styles.input}
            style={tsnBad ? { borderColor: '#f59e0b' } : undefined}
            placeholder="z.B. BKW"
            maxLength={5}
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Typschlüsselnummer (TSN)"
          />
        </div>
      </div>
      {hint && <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.25rem' }}>{hint}</p>}
    </div>
  );
}
