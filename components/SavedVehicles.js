import React, { useCallback, useEffect, useState } from 'react';
import { deleteVehicle, isValidVin, loadVehicles, normalizeVin, saveVehicle, searchVehicles } from '../utils/vehicleStore';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
const title = (v) => [v.make, v.model, v.year].filter(Boolean).join(' ') || 'Fahrzeug';

// Fahrzeugspeicher unter dem VIN-Feld: aktuelles Fahrzeug speichern und gespeicherte Fahrzeuge schnell wieder aufrufen.
// current: { vin, make, model, year, engineType, registration, vinData } aus dem Formular; onLoad(vehicle) übernimmt ein Fahrzeug ins Formular.
export default function SavedVehicles({ current, onLoad, styles }) {
  const [vehicles, setVehicles] = useState([]);
  const [storage, setStorage] = useState('database');
  const [query, setQuery] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [customer, setCustomer] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const reload = useCallback(async () => {
    try {
      const result = await loadVehicles();
      setVehicles(result.vehicles);
      setStorage(result.storage);
    } catch {
      setVehicles([]); // optional, Fehler stören die Diagnose nicht
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const vin = normalizeVin(current?.vin);
  const canSave = isValidVin(vin);
  const saved = canSave ? vehicles.find((v) => v.vin === vin) : null;

  // Kennzeichen/Kunde des gespeicherten Fahrzeugs vorbelegen, sobald dessen VIN eingegeben ist
  useEffect(() => {
    setLicensePlate(saved?.licensePlate || '');
    setCustomer(saved?.customer || '');
    setNote(saved?.note || '');
  }, [saved?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const { created } = await saveVehicle({
        ...current,
        vin,
        licensePlate: licensePlate || saved?.licensePlate || '',
        customer: customer || saved?.customer || '',
        note
      });
      setMessage({ ok: true, text: created ? 'Fahrzeug gespeichert.' : 'Fahrzeug aktualisiert.' });
      await reload();
    } catch (error) {
      setMessage({ ok: false, text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (vehicle) => {
    if (!window.confirm(`${title(vehicle)} (${vehicle.vin}) aus dem Fahrzeugspeicher löschen?`)) return;
    try {
      await deleteVehicle(vehicle.id, storage);
      setMessage({ ok: true, text: 'Fahrzeug gelöscht.' });
      await reload();
    } catch (error) {
      setMessage({ ok: false, text: error.message });
    }
  };

  const shown = searchVehicles(vehicles, query);
  const box = { marginTop: '0.75rem', padding: '0.75rem', border: '1px solid #3d4858', borderRadius: 12, fontFamily: 'inherit' };

  return (
    <div>
      {canSave && (
        <div style={box}>
          <strong>💾 {saved ? 'Im Fahrzeugspeicher' : 'Fahrzeug speichern'}</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              className={styles.input}
              placeholder="Kennzeichen (optional)"
              maxLength={20}
              aria-label="Kennzeichen"
            />
            <input
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className={styles.input}
              placeholder="Kunde (optional)"
              maxLength={200}
              aria-label="Kunde"
            />
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={styles.textarea}
            style={{ marginTop: '0.5rem' }}
            rows={2}
            placeholder="Notiz zum Fahrzeug (optional)"
            maxLength={5000}
            aria-label="Notiz"
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {saved && (
              <button type="button" className={styles.button} style={{ width: 'auto' }} onClick={() => onLoad(saved)}>
                Gespeicherte Daten übernehmen
              </button>
            )}
            <button type="button" className={styles.button} style={{ width: 'auto' }} onClick={handleSave} disabled={busy}>
              {busy ? 'Speichert…' : saved ? 'Aktualisieren' : 'Speichern'}
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: message.ok ? '#16a34a' : '#ef4444' }}>{message.text}</p>
      )}

      {vehicles.length > 0 && (
        <details style={box}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>🚗 Gespeicherte Fahrzeuge ({vehicles.length})</summary>
          {storage === 'local' && (
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.4rem' }}>Ohne Datenbank nur in diesem Browser gespeichert.</p>
          )}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.input}
            style={{ marginTop: '0.5rem' }}
            placeholder="Suchen: VIN, Kennzeichen, Kunde, Marke …"
            aria-label="Gespeicherte Fahrzeuge durchsuchen"
          />
          <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem', maxHeight: 360, overflowY: 'auto' }}>
            {shown.length === 0 && <p style={{ color: '#9ca3af' }}>Keine Treffer.</p>}
            {shown.map((v) => (
              <div key={v.id} className={styles.causeCard}>
                <div className={styles.causeHeader} style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                  <strong>{title(v)}</strong>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                    {v.createdBy ? `${v.createdBy} · ` : ''}{formatDate(v.updatedAt || v.createdAt)}
                  </span>
                </div>
                <div className={styles.causeMeta}><span style={{ fontFamily: 'monospace' }}>{v.vin}</span></div>
                {(v.engineType || v.vinData?.engine) && (
                  <p style={{ marginTop: '0.3rem', fontSize: '0.9rem', color: '#9ca3af' }}>
                    {[v.engineType, v.vinData?.engine?.displacement, v.vinData?.engine?.power].filter(Boolean).join(' · ')}
                  </p>
                )}
                {(v.licensePlate || v.customer) && (
                  <p style={{ marginTop: '0.3rem', fontSize: '0.9rem' }}>
                    {[v.licensePlate, v.customer].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className={styles.button} style={{ width: 'auto' }} onClick={() => onLoad(v)}>Übernehmen</button>
                  <button type="button" className={styles.button} style={{ width: 'auto' }} onClick={() => handleDelete(v)}>Löschen</button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
