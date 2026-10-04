import React, { useState } from 'react';
import { parseCodes, analyzeCodes, SEVERITY_LABELS } from '../utils/multiCodeAnalysis';
import styles from '../styles/KFZDiagnosePlatform.module.css';

const LEVEL_COLORS = { 0: '#6b7280', 1: '#16a34a', 2: '#d97706', 3: '#dc2626', 4: '#7f1d1d' };

const MultiCodeAnalysis = ({ initialCase, onSave }) => {
  const [text, setText] = useState(initialCase?.codes?.join(' ') || '');
  const [vehicle, setVehicle] = useState(initialCase?.vehicle || '');
  const [invalid, setInvalid] = useState([]);
  const [result, setResult] = useState(() => (initialCase?.codes?.length ? analyzeCodes(initialCase.codes) : null));
  const [saved, setSaved] = useState(false);

  const runAnalysis = () => {
    const { valid, invalid: bad } = parseCodes(text);
    setInvalid(bad);
    setSaved(false);
    setResult(valid.length ? analyzeCodes(valid) : null);
  };

  const handleSave = async () => {
    const codes = result.entries.map((e) => e.code);
    const ok = await onSave({
      type: 'multi',
      codes,
      code: codes.join(' '),
      vehicle,
      problem: `${codes.length} Fehlercodes`,
      result: { summary: result.correlations.map((c) => c.title).join('; ') || 'Keine Zusammenhänge erkannt' }
    });
    setSaved(ok);
  };

  return (
    <div className={styles.grid}>
      <div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>📚 Mehrere Fehlercodes auswerten</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>Fahrzeug (optional)</label>
            <input
              className={styles.input}
              placeholder="z.B. Audi A4 B8 2.0 TFSI"
              value={vehicle}
              onChange={(e) => { setVehicle(e.target.value); setSaved(false); }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Fehlercodes
              <span style={{ color: '#6b7280', fontWeight: 'normal' }}> | getrennt durch Leerzeichen, Komma oder Zeilenumbruch</span>
            </label>
            <textarea
              className={styles.input}
              rows={5}
              placeholder={'z.B. P0171 P0174 P0300 P0420'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          {invalid.length > 0 && (
            <div className={styles.error}>Ungültig und ignoriert: {invalid.join(', ')}</div>
          )}
          <button className={styles.button} onClick={runAnalysis} disabled={!text.trim()}>
            🔎 Codes auswerten
          </button>
        </div>
      </div>

      <div>
        {!result ? (
          <div className={styles.placeholderCard}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
            <h3>Auswertung bereit</h3>
            <p style={{ color: '#6b7280' }}>
              Geben Sie alle ausgelesenen Fehlercodes ein. Die App sortiert sie nach Dringlichkeit und erkennt Zusammenhänge zwischen den Fehlern.
            </p>
          </div>
        ) : (
          <div className={styles.resultsCard}>
            <h2 className={styles.cardTitle}>✅ Auswertung von {result.entries.length} Codes</h2>

            {result.correlations.length > 0 ? (
              <div className={styles.section}>
                <h4>🔗 Erkannte Zusammenhänge:</h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {result.correlations.map((c) => (
                    <div key={c.id} className={`${styles.urgencySection} ${styles.urgencyMedium}`}>
                      <strong>{c.title}</strong>
                      <p style={{ marginTop: '0.25rem' }}>{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: '#6b7280' }}>Keine bekannten Zusammenhänge erkannt. Die Codes sollten einzeln geprüft werden.</p>
            )}

            <div className={styles.section}>
              <h4>📋 Reihenfolge nach Dringlichkeit:</h4>
              <div className={styles.causesGrid}>
                {result.entries.map((e, i) => (
                  <div key={e.code} className={styles.causeCard}>
                    <div className={styles.causeHeader}>
                      <strong>{i + 1}. {e.code} – {e.known ? e.info.description : 'Nicht in der Datenbank'}</strong>
                      <span style={{ color: LEVEL_COLORS[e.level], fontWeight: 600 }}>{SEVERITY_LABELS[e.level]}</span>
                    </div>
                    <div className={styles.causeMeta}>
                      <span>{e.known ? e.info.category : e.info.systemHint || 'Bitte Herstellerdaten nutzen'}</span>
                    </div>
                    {e.known && (
                      <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
                        <strong>Mögliche Ursachen:</strong> {e.info.commonCauses.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {result.unknownCount > 0 && (
              <p style={{ color: '#6b7280' }}>
                {result.unknownCount} Code(s) sind nicht in der Datenbank und fließen nur in die Zusammenhangsregeln ein.
              </p>
            )}

            <button className={styles.button} onClick={handleSave} style={{ marginTop: '1rem' }}>
              {saved ? '✅ Im Verlauf gespeichert' : '💾 Im Verlauf speichern'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiCodeAnalysis;
