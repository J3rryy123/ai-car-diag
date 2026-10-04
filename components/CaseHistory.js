import React, { useEffect, useState } from 'react';
import { loadCases, updateCase, deleteCase, searchCases } from '../utils/caseHistory';
import styles from '../styles/KFZDiagnosePlatform.module.css';

const formatDate = (iso) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });

const CaseHistory = ({ refreshKey, onOpen }) => {
  const [cases, setCases] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setCases(loadCases());
  }, [refreshKey]);

  const visible = searchCases(cases, query);

  const handleChange = (id, field, value) => setCases(updateCase(id, { [field]: value }));

  const handleDelete = (id) => {
    if (window.confirm('Diesen Fall wirklich löschen?')) setCases(deleteCase(id));
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>🗂️ Diagnoseverlauf</h2>
      <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
        Fälle werden lokal in diesem Browser gespeichert. Kunde und Notiz lassen sich pro Fall ergänzen.
      </p>
      <input
        className={styles.input}
        placeholder="Suchen nach Kunde, Fahrzeug, VIN, Fehlercode, Problem …"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {visible.length === 0 && (
        <p style={{ color: '#6b7280' }}>
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
              <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{formatDate(c.createdAt)}</span>
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
