import React, { useRef, useState } from 'react';

const MAX_SIDE = 1800;
const MAX_BYTES = 2_800_000;

// Verkleinert das Foto im Browser (Handyfotos sind oft 5–10 MB) und liefert eine JPEG-Data-URL
async function prepareImage(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  for (const quality of [0.85, 0.7, 0.55]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length * 0.75 <= MAX_BYTES) return dataUrl;
  }
  throw new Error('Das Foto ist zu groß.');
}

const LABELS = [
  ['vin', 'FIN'],
  ['make', 'Marke'],
  ['model', 'Handelsbezeichnung'],
  ['type', 'Typ/Variante'],
  ['firstRegistration', 'Erstzulassung'],
  ['fuelRaw', 'Kraftstoff'],
  ['hsn', 'HSN'],
  ['tsn', 'TSN'],
];

const formatDate = (iso) => iso.split('-').reverse().join('.');

// Foto des Fahrzeugscheins aufnehmen/auswählen und die Daten per KI auslesen.
// onResult(fields) übernimmt die Werte ins Formular; das Bild wird nicht gespeichert.
export default function RegistrationScan({ onResult, styles }) {
  const inputRef = useRef(null);
  const [state, setState] = useState({ status: 'idle' });

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setState({ status: 'loading' });
    try {
      const image = await prepareImage(file);
      const response = await fetch('/api/scan-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Der Fahrzeugschein konnte nicht gelesen werden.');
      onResult(data.fields);
      setState({ status: 'done', fields: data.fields, warnings: data.warnings || [] });
    } catch (error) {
      setState({ status: 'error', message: error.message });
    }
  };

  const { status, fields, warnings, message } = state;

  return (
    <div className={styles.formGroup}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className={styles.input}
        style={{ cursor: 'pointer', textAlign: 'center' }}
        disabled={status === 'loading'}
        onClick={() => inputRef.current?.click()}
      >
        {status === 'loading' ? '⏳ Fahrzeugschein wird gelesen …' : '📷 Fahrzeugschein scannen'}
      </button>

      {status === 'error' && (
        <div className={`${styles.vinInfo} ${styles.vinInfoInvalid}`}>
          <div style={{ color: '#f87171' }}>❌ {message}</div>
        </div>
      )}

      {status === 'done' && (
        <div className={`${styles.vinInfo} ${styles.vinInfoValid}`}>
          {LABELS.filter(([key]) => fields[key]).map(([key, label]) => (
            <div key={key}>
              <strong>{label}:</strong> {key === 'firstRegistration' ? formatDate(fields[key]) : fields[key]}
            </div>
          ))}
          {fields.powerKw && (
            <div><strong>Leistung:</strong> {fields.powerKw} kW ({fields.powerPs} PS)</div>
          )}
          {fields.displacementCcm && <div><strong>Hubraum:</strong> {fields.displacementCcm} cm³</div>}
          {warnings.map((warning) => (
            <div key={warning} style={{ color: '#f59e0b' }}>⚠️ {warning}</div>
          ))}
          <div style={{ color: '#9ca3af', fontSize: '0.85em' }}>
            Automatisch gelesen – bitte mit dem Fahrzeugschein abgleichen. Das Foto wird nicht gespeichert.
          </div>
        </div>
      )}
    </div>
  );
}
