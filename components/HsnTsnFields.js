import React, { useEffect, useRef, useState } from 'react';
import { cleanHsn, cleanTsn, HSN_PATTERN, TSN_PATTERN, withHsnTsn } from '../utils/hsnTsn';

const formatDate = (iso) => (iso ? iso.split('-').reverse().join('.') : '');

// Eingabe von HSN (Feld 2.1) und TSN (Feld 2.2) aus dem Fahrzeugschein zur genaueren Fahrzeugerkennung.
// registration: Fahrzeugschein-Daten (Scan oder manuelle Eingabe); onChange(registration) liefert die aktualisierten Daten.
// onLookup(treffer) meldet Hersteller/Handelsname aus dem KBA-Schlüsselverzeichnis, z. B. zum Vorbelegen von Marke und Modell.
export default function HsnTsnFields({ registration, onChange, onLookup, styles }) {
  const hsn = registration?.hsn || '';
  const tsn = registration?.tsn || '';
  const hsnBad = hsn.length > 0 && !HSN_PATTERN.test(hsn);
  const tsnBad = tsn.length > 0 && !TSN_PATTERN.test(tsn);
  const hint = (hsn || tsn) && !(HSN_PATTERN.test(hsn) && TSN_PATTERN.test(tsn))
    ? 'HSN (4 Zeichen) und TSN (3 Zeichen) werden erst vollständig für die Analyse verwendet.'
    : null;

  // Nachschlagen im KBA-Schlüsselverzeichnis (Datenbank); ohne Datenbank oder Treffer bleibt die Anzeige leer
  const [kba, setKba] = useState(null);
  const onLookupRef = useRef(onLookup);
  onLookupRef.current = onLookup;
  useEffect(() => {
    if (!HSN_PATTERN.test(hsn)) {
      setKba(null);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const query = `hsn=${encodeURIComponent(hsn)}${TSN_PATTERN.test(tsn) ? `&tsn=${encodeURIComponent(tsn)}` : ''}`;
        const response = await fetch(`/api/kba?${query}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (cancelled) return;
        setKba(data.found ? data : null);
        if (data.found) onLookupRef.current?.(data);
      } catch {
        if (!cancelled) setKba(null); // optional, Fehler stören die Eingabe nicht
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hsn, tsn]);

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
      {kba && (
        <div className={`${styles.vinInfo} ${styles.vinInfoValid}`} style={{ marginTop: '0.5rem' }}>
          <div><strong>Hersteller (KBA):</strong> {kba.manufacturer}</div>
          {kba.tradeName && <div><strong>Handelsname (KBA):</strong> {kba.tradeName}</div>}
          {kba.tsn === null && TSN_PATTERN.test(tsn) && (
            <div style={{ color: '#9ca3af', fontSize: '0.85em' }}>Diese TSN steht nicht im Verzeichnis (Stand {formatDate(kba.stand) || 'unbekannt'}); neuere Typen fehlen eventuell.</div>
          )}
          <div style={{ color: '#9ca3af', fontSize: '0.85em' }}>
            Quelle: © Kraftfahrt-Bundesamt, Flensburg{kba.stand ? ` (Stand ${formatDate(kba.stand)})` : ''}, Datenlizenz Deutschland – Namensnennung – Version 2.0
          </div>
        </div>
      )}
    </div>
  );
}
