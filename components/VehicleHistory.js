import React, { useEffect, useState } from 'react';
import { loadVehicleCases } from '../utils/caseHistory';

const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const clip = (text, max) => (text && text.length > max ? `${text.slice(0, max)}…` : text);

const typeLabel = (c) =>
  c.type === 'obd2' ? `🔧 ${c.code || 'OBD2'}` : c.type === 'guided' ? '🧭 Geführt' : c.type === 'multi' ? '📚 Mehrere Codes' : '🔍 Diagnose';

// Frühere Fälle zu einem Fahrzeug (nach VIN), z. B. unter dem VIN-Feld.
// vin: bereinigte, gültige 17-stellige VIN (sonst wird nichts angezeigt); refreshKey lädt nach neuen Fällen neu.
export default function VehicleHistory({ vin, refreshKey, onOpen, styles }) {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    if (!vin || vin.length !== 17) {
      setCases([]);
      return undefined;
    }
    let cancelled = false;
    loadVehicleCases(vin)
      .then((found) => !cancelled && setCases(found))
      .catch(() => !cancelled && setCases([])); // Historie ist optional, Fehler stören nicht
    return () => {
      cancelled = true;
    };
  }, [vin, refreshKey]);

  if (cases.length === 0) return null;

  return (
    <details
      open
      style={{ marginTop: '0.75rem', padding: '0.75rem', border: '1px solid #3d4858', borderRadius: 12, fontFamily: 'inherit' }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>📚 Frühere Fälle zu diesem Fahrzeug ({cases.length})</summary>
      <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
        {cases.map((c) => {
          const diagnosis = c.result?.diagnosis;
          return (
            <div key={c.id} className={styles.causeCard}>
              <div className={styles.causeHeader} style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                <strong>{typeLabel(c)}</strong>
                <span style={{ color: '#9ca3af', fontSize: '0.85rem', marginLeft: '0.75rem' }}>
                  {c.createdBy ? `${c.createdBy} · ` : ''}{formatDate(c.createdAt)}
                </span>
              </div>
              {c.problem && <div className={styles.causeMeta}><span>{clip(c.problem, 140)}</span></div>}
              {diagnosis && <p style={{ marginTop: '0.4rem', color: '#9ca3af', fontSize: '0.9rem' }}>{clip(diagnosis, 200)}</p>}
              {(c.customer || c.note) && (
                <p style={{ marginTop: '0.4rem', fontSize: '0.9rem' }}>
                  {c.customer && <strong>{c.customer}</strong>}{c.customer && c.note ? ' · ' : ''}{clip(c.note, 200)}
                </p>
              )}
              <button type="button" className={styles.button} style={{ marginTop: '0.5rem', width: 'auto' }} onClick={() => onOpen(c)}>
                Öffnen
              </button>
            </div>
          );
        })}
      </div>
    </details>
  );
}
