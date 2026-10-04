import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadCases,
  loadLocalCases,
  updateCase,
  deleteCase,
  importLocalCases,
  searchCases
} from '../utils/caseHistory';
import styles from '../styles/KFZDiagnosePlatform.module.css';

const formatDate = (iso) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
const SAVE_DELAY_MS = 600;

const CaseHistory = ({ refreshKey, onOpen }) => {
  const [cases, setCases] = useState([]);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [localCount, setLocalCount] = useState(0);
  const timers = useRef({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadCases();
      setCases(result.cases);
      setStorage(result.storage);
      setLocalCount(result.storage === 'database' ? loadLocalCases().length : 0);
    } catch (err) {
      setError(err.message || 'Verlauf konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  // Ausstehende Änderungen beim Verlassen des Tabs nicht verlieren
  useEffect(() => () => Object.values(timers.current).forEach((t) => t.flush()), []);

  const visible = searchCases(cases, query);

  // Eingaben sofort anzeigen, das Speichern erfolgt kurz verzögert (pro Fall und Feld)
  const handleChange = (id, field, value) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    const key = `${id}:${field}`;
    clearTimeout(timers.current[key]?.timer);
    const flush = async () => {
      clearTimeout(timers.current[key]?.timer);
      delete timers.current[key];
      try {
        await updateCase(id, { [field]: value }, storage);
      } catch (err) {
        setError(err.message || 'Änderung konnte nicht gespeichert werden.');
      }
    };
    timers.current[key] = { timer: setTimeout(flush, SAVE_DELAY_MS), flush };
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Diesen Fall wirklich löschen?')) return;
    try {
      await deleteCase(id, storage);
      setCases((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.message || 'Fall konnte nicht gelöscht werden.');
    }
  };

  const handleImport = async () => {
    try {
      await importLocalCases();
      await refresh();
    } catch (err) {
      setError(err.message || 'Import fehlgeschlagen.');
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>🗂️ Diagnoseverlauf</h2>
      <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
        {storage === 'database'
          ? 'Fälle werden in der Datenbank gespeichert und sind auf allen Geräten verfügbar.'
          : 'Keine Datenbank konfiguriert: Fälle werden nur lokal in diesem Browser gespeichert.'}{' '}
        Kunde und Notiz lassen sich pro Fall ergänzen.
      </p>

      {error && <div className={styles.error}>⚠️ {error}</div>}

      {storage === 'database' && localCount > 0 && (
        <div className={`${styles.urgencySection} ${styles.urgencyMedium}`} style={{ marginBottom: '1rem' }}>
          <strong>{localCount} lokal gespeicherte Fälle gefunden.</strong>
          <div style={{ marginTop: '0.5rem' }}>
            <button className={styles.button} style={{ width: 'auto' }} onClick={handleImport}>
              In Datenbank übernehmen
            </button>
          </div>
        </div>
      )}

      <input
        className={styles.input}
        placeholder="Suchen nach Kunde, Fahrzeug, VIN, Fehlercode, Problem …"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {loading && <p style={{ color: '#9ca3af' }}>Lade Verlauf …</p>}

      {!loading && visible.length === 0 && (
        <p style={{ color: '#9ca3af' }}>
          {cases.length === 0 ? 'Noch keine Fälle gespeichert. Jede Analyse wird automatisch hier abgelegt.' : 'Keine Treffer.'}
        </p>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {visible.map((c) => (
          <div key={c.id} className={styles.causeCard}>
            <div className={styles.causeHeader}>
              <strong>
                {c.type === 'obd2' ? `🔧 ${c.code}` : c.type === 'guided' ? '🧭 Geführt' : c.type === 'multi' ? '📚 Mehrere Codes' : '🔍 Diagnose'} · {c.vehicle || 'Fahrzeug unbekannt'}
              </strong>
              <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                {c.createdBy ? `${c.createdBy} · ` : ''}{formatDate(c.createdAt)}
              </span>
            </div>
            <div className={styles.causeMeta}>
              {c.vin && <span>VIN: {c.vin}</span>}
              {c.problem && <span>{c.problem.length > 120 ? `${c.problem.slice(0, 120)}…` : c.problem}</span>}
            </div>
            <input
              className={styles.input}
              placeholder="Kunde / Auftrag"
              value={c.customer}
              onChange={(e) => handleChange(c.id, 'customer', e.target.value)}
              style={{ marginTop: '0.75rem' }}
            />
            <textarea
              className={styles.input}
              placeholder="Notiz (z. B. Messwerte, durchgeführte Reparatur)"
              rows={2}
              value={c.note}
              onChange={(e) => handleChange(c.id, 'note', e.target.value)}
              style={{ marginTop: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className={styles.button} onClick={() => onOpen(c)}>Öffnen</button>
              <button className={styles.button} style={{ background: '#dc2626' }} onClick={() => handleDelete(c.id)}>
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CaseHistory;
