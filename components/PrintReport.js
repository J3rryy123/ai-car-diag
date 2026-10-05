import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const formatDate = (date) =>
  date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

// Druckansicht der Diagnose (für „Als PDF speichern“ / Drucken). Auf dem Bildschirm unsichtbar,
// beim Drucken die einzige sichtbare Seite (siehe .print-report in globals.css).
// type: 'diagnose' | 'obd2'; vehicle: { make, model, year, engineType, vin, registration }.
export default function PrintReport({ type, result, vehicle = {}, problem, code, codeInfo, customer }) {
  // Der Bericht hängt direkt unter <body>, damit beim Drucken die restliche App per display:none entfällt
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!result || !mounted) return null;

  const causes = asList(result.possibleCauses);
  const steps = asList(result.nextSteps);
  const symptoms = asList(result.symptoms);
  const reg = vehicle.registration || {};
  const vehicleName = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ');

  const facts = [
    ['Fahrzeug', vehicleName],
    ['Motor', [capitalize(vehicle.engineType), reg.displacementCcm && `${reg.displacementCcm} cm³`, reg.powerKw && `${reg.powerKw} kW`].filter(Boolean).join(', ')],
    ['FIN', vehicle.vin],
    ['HSN/TSN', reg.hsn && reg.tsn ? `${reg.hsn}/${reg.tsn}` : ''],
    ['Kunde', customer],
  ].filter(([, value]) => value);

  return createPortal(
    <section className="print-report" aria-hidden="true">
      <header className="print-header">
        <img src="/logo.png" alt="" width="64" />
        <div>
          <h1>{type === 'obd2' ? 'OBD2-Diagnosebericht' : 'Diagnosebericht'}</h1>
          <p>Smart Repair Service · {formatDate(new Date())}</p>
        </div>
      </header>

      {facts.length > 0 && (
        <dl className="print-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {type === 'obd2' ? (
        <div className="print-block">
          <h2>Fehlercode {code}</h2>
          <p>
            {[codeInfo?.description, result.category && `Kategorie: ${result.category}`, result.severity && `Schweregrad: ${result.severity}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      ) : (
        problem && (
          <div className="print-block">
            <h2>Beschriebenes Problem</h2>
            <p>{problem}</p>
          </div>
        )
      )}

      <div className="print-block">
        <h2>Einschätzung</h2>
        <p>{result.diagnosis}</p>
        {result.confidence != null && <p className="print-muted">Sicherheit der Einschätzung: {result.confidence} %</p>}
      </div>

      {symptoms.length > 0 && (
        <div className="print-block">
          <h2>Typische Symptome</h2>
          <ul>{symptoms.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}

      {causes.length > 0 && (
        <div className="print-block">
          <h2>Mögliche Ursachen</h2>
          <table>
            <thead>
              <tr><th>Ursache</th><th>Wahrscheinlichkeit</th><th>Kosten (geschätzt)</th></tr>
            </thead>
            <tbody>
              {causes.map((c, i) => (
                <tr key={i}>
                  <td>{c.cause}</td>
                  <td>{c.probability != null ? `${c.probability} %` : ''}</td>
                  <td>{c.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {steps.length > 0 && (
        <div className="print-block">
          <h2>Empfohlene Schritte</h2>
          <ol>{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      )}

      {(result.urgency || result.estimatedCost) && (
        <div className="print-block">
          {result.urgency && <p><strong>Dringlichkeit:</strong> {result.urgency}</p>}
          {result.estimatedCost && <p><strong>Geschätzte Gesamtkosten:</strong> {result.estimatedCost}</p>}
        </div>
      )}

      {result.vehicleSpecific && (
        <div className="print-block">
          <h2>Hinweise zum Fahrzeug</h2>
          <p>{result.vehicleSpecific}</p>
        </div>
      )}

      {result.maintenanceRecommendations && (
        <div className="print-block">
          <h2>Wartungsempfehlung</h2>
          <p>{result.maintenanceRecommendations}</p>
        </div>
      )}

      <footer className="print-footer">
        KI-gestützte Einschätzung auf Basis der angegebenen Daten – keine verbindliche Diagnose. Kosten sind grobe
        Richtwerte. Eine Prüfung am Fahrzeug durch die Werkstatt bleibt maßgeblich.
      </footer>
    </section>,
    document.body
  );
}
