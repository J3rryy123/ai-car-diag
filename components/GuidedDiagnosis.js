import React, { useState } from 'react';
import GUIDED_PROCEDURES from '../utils/guidedProcedures';
import styles from '../styles/KFZDiagnosePlatform.module.css';

const STATUS = [
  { key: 'ok', label: '✅ In Ordnung' },
  { key: 'fail', label: '❌ Auffällig' },
  { key: 'skip', label: '⏭️ Übersprungen' }
];

const GuidedDiagnosis = ({ initialCase, onSave }) => {
  const [procedureId, setProcedureId] = useState(initialCase?.procedureId || null);
  const [vehicle, setVehicle] = useState(initialCase?.vehicle || '');
  const [progress, setProgress] = useState(initialCase?.progress || {});
  const [saved, setSaved] = useState(false);

  const procedure = GUIDED_PROCEDURES.find((p) => p.id === procedureId);

  const setStep = (stepId, changes) => {
    setSaved(false);
    setProgress((prev) => ({ ...prev, [stepId]: { ...prev[stepId], ...changes } }));
  };

  const choose = (id) => {
    setProcedureId(id);
    setProgress({});
    setSaved(false);
  };

  if (!procedure) {
    return (
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>🧭 Geführte Fehlersuche</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Wählen Sie das Fehlerbild. Sie werden Schritt für Schritt durch die Prüfungen geführt und halten Messwerte fest.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {GUIDED_PROCEDURES.map((p) => (
            <button key={p.id} className={styles.button} style={{ justifyContent: 'flex-start' }} onClick={() => choose(p.id)}>
              <span>{p.icon}</span>
              <span style={{ textAlign: 'left' }}>
                {p.title}
                <br />
                <small style={{ fontWeight: 'normal', opacity: 0.85 }}>{p.description}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const steps = procedure.steps;
  const done = steps.filter((s) => progress[s.id]?.status).length;
  const failed = steps.filter((s) => progress[s.id]?.status === 'fail');
  const finished = done === steps.length;

  const handleSave = () => {
    onSave({
      type: 'guided',
      procedureId: procedure.id,
      vehicle,
      problem: procedure.title,
      progress,
      result: {
        summary: failed.length
          ? `Auffällig: ${failed.map((s) => s.title).join('; ')}`
          : finished ? 'Alle Prüfschritte ohne Auffälligkeit' : 'Prüfung nicht abgeschlossen'
      }
    });
    setSaved(true);
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{procedure.icon} {procedure.title}</h2>

      <div className={styles.formGroup}>
        <label className={styles.label}>Fahrzeug (optional)</label>
        <input
          className={styles.input}
          placeholder="z.B. VW Golf 7 2.0 TDI"
          value={vehicle}
          onChange={(e) => { setVehicle(e.target.value); setSaved(false); }}
        />
      </div>

      <p style={{ margin: '0.5rem 0 1rem', color: '#6b7280' }}>
        Fortschritt: {done} von {steps.length} Schritten · Richtwerte sind allgemein, Herstellerangaben haben Vorrang.
      </p>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {steps.map((step, index) => {
          const state = progress[step.id] || {};
          return (
            <div key={step.id} className={styles.causeCard}>
              <div className={styles.causeHeader}>
                <strong>{index + 1}. {step.title}</strong>
              </div>
              <p style={{ margin: '0.5rem 0' }}>{step.how}</p>
              <p style={{ margin: '0.25rem 0', color: '#6b7280' }}><strong>Soll:</strong> {step.expected}</p>

              {step.measure && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    className={styles.input}
                    placeholder={step.measure.label}
                    inputMode="decimal"
                    value={state.value || ''}
                    onChange={(e) => setStep(step.id, { value: e.target.value })}
                  />
                  <span>{step.measure.unit}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {STATUS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setStep(step.id, { status: s.key })}
                    className={styles.button}
                    style={{
                      width: 'auto',
                      padding: '0.5rem 0.9rem',
                      background: state.status === s.key ? (s.key === 'fail' ? '#dc2626' : s.key === 'ok' ? '#16a34a' : '#6b7280') : '#e5e7eb',
                      color: state.status === s.key ? 'white' : '#1f2937'
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {state.status === 'fail' && (
                <div className={`${styles.urgencySection} ${styles.urgencyMedium}`} style={{ marginTop: '0.75rem' }}>
                  <strong>💡 Hinweis:</strong> {step.failHint}
                </div>
              )}

              <textarea
                className={styles.input}
                rows={1}
                placeholder="Notiz zu diesem Schritt"
                value={state.note || ''}
                onChange={(e) => setStep(step.id, { note: e.target.value })}
                style={{ marginTop: '0.5rem' }}
              />
            </div>
          );
        })}
      </div>

      {finished && (
        <div className={styles.diagnosisSection} style={{ marginTop: '1.5rem' }}>
          <h4>📋 Zusammenfassung</h4>
          {failed.length === 0 ? (
            <p>Alle Schritte ohne Auffälligkeit. Fehlerbild erneut eingrenzen oder ein anderes Prüfprogramm starten.</p>
          ) : (
            <ul>
              {failed.map((s) => (
                <li key={s.id}><strong>{s.title}:</strong> {s.failHint}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
        <button className={styles.button} onClick={handleSave} disabled={done === 0}>
          {saved ? '✅ Im Verlauf gespeichert' : '💾 Im Verlauf speichern'}
        </button>
        <button className={styles.button} style={{ background: '#6b7280' }} onClick={() => setProcedureId(null)}>
          Anderes Fehlerbild
        </button>
      </div>
    </div>
  );
};

export default GuidedDiagnosis;
