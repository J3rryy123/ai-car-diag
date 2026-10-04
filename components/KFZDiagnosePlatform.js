// main Component
import React, { useState, useRef } from 'react';
import VIN_DECODER from '../utils/vinDecoder';
import OBD2_DECODER from '../utils/obdDecoder';
import CaseHistory from './CaseHistory';
import GuidedDiagnosis from './GuidedDiagnosis';
import MultiCodeAnalysis from './MultiCodeAnalysis';
import { addCase } from '../utils/caseHistory';
import styles from '../styles/KFZDiagnosePlatform.module.css';

const NAV_ITEMS = [
  { id: 'diagnose', icon: '🔍', label: 'Diagnose', short: 'Diagnose' },
  { id: 'obd2', icon: '🔧', label: 'OBD2-Diagnose', short: 'OBD2' },
  { id: 'multi', icon: '📚', label: 'Mehrere Codes', short: 'Codes' },
  { id: 'guided', icon: '🧭', label: 'Geführte Suche', short: 'Geführt' },
  { id: 'history', icon: '🗂️', label: 'Verlauf', short: 'Verlauf' }
];

// Anzeige des VIN-Ergebnisses: zeigt nur, was tatsächlich erkannt wurde
function VinInfo({ decoded, styles: s }) {
  if (!decoded) return null;
  if (!decoded.isValid) {
    return (
      <div className={`${s.vinInfo} ${s.vinInfoInvalid}`}>
        <div style={{color: '#f87171'}}>❌ {decoded.error || 'Ungültige VIN'}</div>
      </div>
    );
  }
  const { manufacturer, year, model, engine } = decoded;
  const engineParts = [engine?.displacement, engine?.fuelType, engine?.power, engine?.name].filter(Boolean);
  const hint = {
    loading: 'Modell- und Motordaten werden abgefragt …',
    none: 'Zu dieser VIN liegen keine Modell-/Motordaten vor – bitte laut Fahrzeugschein ergänzen.',
    unavailable: 'Fahrzeugdatenbank nicht erreichbar – bitte Modell und Motor manuell angeben.'
  }[decoded.lookup];
  return (
    <div className={`${s.vinInfo} ${s.vinInfoValid}`}>
      <div><strong>Hersteller:</strong> {manufacturer?.name} ({manufacturer?.country})</div>
      {model?.series && <div><strong>Modell:</strong> {model.series}</div>}
      {year?.modelYear && (
        <div>
          <strong>Baujahr:</strong> {year.modelYear}
          {year.confidence === 'estimated' ? ' (Schätzung aus VIN-Stelle 10)' : ''}
          {year.age != null ? ` · ${year.age} Jahre alt` : ''}
        </div>
      )}
      {engineParts.length > 0 && <div><strong>Motor:</strong> {engineParts.join(' · ')}</div>}
      {hint && <div style={{color: '#9ca3af', fontSize: '0.85em'}}>{hint}</div>}
      {decoded.lookup === 'done' && (
        <div style={{color: '#9ca3af', fontSize: '0.85em'}}>
          Quelle: {decoded.dataSource}. Bitte mit dem Fahrzeugschein abgleichen.
        </div>
      )}
    </div>
  );
}

const KFZDiagnosePlatform = () => {
  // Tab Management
  const [activeTab, setActiveTab] = useState('diagnose');
  
  // Diagnose Tab States
  const [problem, setProblem] = useState('');
  const [carDetails, setCarDetails] = useState({
    make: '',
    model: '',
    year: '',
    engineType: ''
  });
  const [vin, setVin] = useState('');
  const [vinDecoded, setVinDecoded] = useState(null);
  const [results, setResults] = useState(null);
  
  // OBD2 Tab States
  const [obdVin, setObdVin] = useState('');
  const [obdVinDecoded, setObdVinDecoded] = useState(null);
  const [obdCode, setObdCode] = useState('');
  const [obdCodeDecoded, setObdCodeDecoded] = useState(null);
  const [obdResults, setObdResults] = useState(null);
  
  // Global States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [guidedCase, setGuidedCase] = useState(null);
  const [guidedKey, setGuidedKey] = useState(0);
  const [multiCase, setMultiCase] = useState(null);
  const [multiKey, setMultiKey] = useState(0);

  // Modell-/Motordaten aus der Fahrzeugdatenbank nachladen (lokale Erkennung bleibt als Fallback)
  const lookupSeq = useRef({ diagnose: 0, obd: 0 });
  const enrichVin = async (target, cleaned, local, setDecoded, onMerged) => {
    const seq = ++lookupSeq.current[target];
    setDecoded({ ...local, lookup: 'loading' });
    try {
      const response = await fetch('/api/vin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin: cleaned })
      });
      if (seq !== lookupSeq.current[target]) return; // veraltete Antwort
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { found, data } = await response.json();
      if (!found) {
        setDecoded({ ...local, lookup: 'none' });
        return;
      }
      const merged = { ...VIN_DECODER.mergeRemote(local, data), lookup: 'done' };
      setDecoded(merged);
      onMerged?.(merged);
    } catch {
      if (seq === lookupSeq.current[target]) setDecoded({ ...local, lookup: 'unavailable' });
    }
  };

  const FORM_FUELS = { Benzin: 'benzin', Diesel: 'diesel', Hybrid: 'hybrid', Elektro: 'elektro' };

  // VINDecoder for Diagnose Tab
  const handleVinChange = (inputVin) => {
    setVin(inputVin);
    const cleaned = VIN_DECODER.cleanVIN(inputVin);
    if (cleaned.length < 17) {
      lookupSeq.current.diagnose++;
      setVinDecoded(null);
      return;
    }
    const decoded = VIN_DECODER.decodeVIN(cleaned);
    setVinDecoded(decoded);
    if (!decoded?.isValid) return;
    // Nur sicher erkannte Werte ins Formular übernehmen
    setCarDetails(prev => ({
      ...prev,
      make: decoded.manufacturer?.name || prev.make,
      year: decoded.year?.modelYear ? String(decoded.year.modelYear) : prev.year
    }));
    enrichVin('diagnose', cleaned, decoded, setVinDecoded, (merged) => {
      setCarDetails(prev => ({
        ...prev,
        model: merged.model?.series || prev.model,
        engineType: FORM_FUELS[merged.engine?.fuelType] || prev.engineType
      }));
    });
  };

  // VINDecoder for OBD2 Tab
  const handleObdVinChange = (inputVin) => {
    setObdVin(inputVin);
    const cleaned = VIN_DECODER.cleanVIN(inputVin);
    if (cleaned.length < 17) {
      lookupSeq.current.obd++;
      setObdVinDecoded(null);
      return;
    }
    const decoded = VIN_DECODER.decodeVIN(cleaned);
    setObdVinDecoded(decoded);
    if (decoded?.isValid) enrichVin('obd', cleaned, decoded, setObdVinDecoded);
  };

  // OBD2 Code Decoder
  const handleObdCodeChange = (inputCode) => {
    const cleanCode = inputCode.trim().toUpperCase();
    setObdCode(cleanCode);
    
    if (cleanCode.length >= 4) {
      try {
        const decoded = OBD2_DECODER.decodeCode(cleanCode);
        setObdCodeDecoded(decoded);
      } catch (error) {
        console.error('Fehler beim Dekodieren des OBD2-Codes:', error);
        setObdCodeDecoded(null);
      }
    } else {
      setObdCodeDecoded(null);
    }
  };

  // Diagnose-Analyse
  const analyzeWithAI = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      const requestData = {
        type: 'diagnose',
        problem,
        carDetails,
        vin: VIN_DECODER.cleanVIN(vin) || null,
        vinDecoded: vinDecoded || null
      };

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Fehler bei der Analyse');
      }

      const data = await response.json();
      setResults(data.analysis);
      saveCase({
        type: 'diagnose',
        vehicle: [carDetails.make, carDetails.model, carDetails.year].filter(Boolean).join(' '),
        vin: vin || '',
        problem,
        carDetails,
        result: data.analysis
      });
      setDebugInfo({
        mode: data.mode,
        debug: data.debug,
        error: data.error,
        timestamp: data.timestamp,
        modelUsed: data.modelUsed
      });

    } catch (err) {
      setError('Fehler bei der KI-Analyse. Bitte versuchen Sie es erneut.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // OBD2 Analyse
  const analyzeOBD2 = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!obdCode.trim()) {
        throw new Error('Bitte geben Sie einen OBD2-Code ein');
      }
      
      if (obdCode.length < 4) {
        throw new Error('OBD2-Code muss mindestens 4 Zeichen lang sein');
      }
      
      if (!obdCodeDecoded) {
        throw new Error('Unbekannter oder ungültiger OBD2-Code');
      }
      
      const requestData = {
        type: 'obd2',
        obdCode: obdCode.toUpperCase(),
        obdVin: VIN_DECODER.cleanVIN(obdVin) || null,
        obdVinDecoded: obdVinDecoded || null,
        codeInfo: obdCodeDecoded
      };

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Fehler bei der OBD2-Analyse');
      }

      const data = await response.json();
      setObdResults(data.analysis);
      saveCase({
        type: 'obd2',
        code: obdCode.toUpperCase(),
        vehicle: obdVinDecoded?.isValid
          ? [obdVinDecoded.manufacturer?.name, obdVinDecoded.year?.modelYear].filter(Boolean).join(' ')
          : '',
        vin: obdVin || '',
        problem: obdCodeDecoded?.description || '',
        result: data.analysis
      });
      
      setDebugInfo({
        mode: data.mode,
        debug: data.debug,
        error: data.error,
        timestamp: data.timestamp,
        modelUsed: data.modelUsed
      });

    } catch (err) {
      setError(err.message || 'Fehler bei der OBD2-Analyse. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  // Fall im Verlauf speichern (Datenbank, sonst lokal)
  const saveCase = async (entry) => {
    try {
      await addCase(entry);
      setHistoryVersion(v => v + 1);
      return true;
    } catch (err) {
      setError(err.message || 'Fall konnte nicht im Verlauf gespeichert werden.');
      return false;
    }
  };

  // Tab wechseln; Geführte Suche und Mehrfach-Codes starten dabei leer
  const openTab = (id) => {
    if (id === 'multi' && activeTab !== 'multi') { setMultiCase(null); setMultiKey(k => k + 1); }
    if (id === 'guided' && activeTab !== 'guided') { setGuidedCase(null); setGuidedKey(k => k + 1); }
    setActiveTab(id);
    window.scrollTo({ top: 0 });
  };

  // Fall aus dem Verlauf wieder öffnen
  const openCase = (c) => {
    setError(null);
    setDebugInfo(null);
    if (c.type === 'multi') {
      setMultiCase(c);
      setMultiKey(k => k + 1);
      setActiveTab('multi');
    } else if (c.type === 'guided') {
      setGuidedCase(c);
      setGuidedKey(k => k + 1);
      setActiveTab('guided');
    } else if (c.type === 'obd2') {
      handleObdVinChange(c.vin || '');
      handleObdCodeChange(c.code || '');
      setObdResults(c.result);
      setActiveTab('obd2');
    } else {
      handleVinChange(c.vin || '');
      setCarDetails(c.carDetails || { make: '', model: '', year: '', engineType: '' });
      setProblem(c.problem || '');
      setResults(c.result);
      setActiveTab('diagnose');
    }
  };

  // Utility Functions
  const getModeColor = (mode) => {
    if (mode && mode.includes('demo')) return '#f59e0b';
    if (mode === 'claude') return '#16a34a';
    if (mode === 'claude-fallback') return '#0891b2';
    return '#6b7280';
  };

  const getModeText = (mode) => {
    if (!mode) return 'Unbekannt';
    if (mode === 'claude') return '✅ Echte Claude API';
    if (mode === 'claude-obd2') return '✅ Claude OBD2-Analyse';
    if (mode === 'claude-fallback') return '⚠️ Claude API (Fallback)';
    if (mode === 'claude-obd2-fallback') return '⚠️ Claude OBD2 (Fallback)';
    if (mode.includes('demo')) return '⚠️ Demo-Modus';
    if (mode.includes('error')) return '❌ API-Fehler';
    return mode;
  };

  // Render Diagnose Results
  const renderDiagnosisResults = () => {
    if (!results) return null;

    return (
      <div className={styles.resultsCard}>
        <div className={styles.resultsHeader}>
          <h2 className={styles.cardTitle}>✅ Diagnose-Ergebnis</h2>
          <span className={`${styles.aiModelBadge} ${styles.claudeBadge}`}>
            🤖 Claude
          </span>
        </div>
        
        <div className={styles.diagnosisSection}>
          <p>{results.diagnosis}</p>
          <div className={styles.confidenceScore}>
            <strong>Vertrauen:</strong> {results.confidence}%
          </div>
        </div>

        {results.possibleCauses && (
          <div className={styles.section}>
            <h4>🔍 Mögliche Ursachen:</h4>
            <div className={styles.causesGrid}>
              {results.possibleCauses.map((cause, index) => (
                <div key={index} className={styles.causeCard}>
                  <div className={styles.causeHeader}>
                    <strong>{cause.cause}</strong>
                    <span className={`${styles.probabilityBadge} ${
                      cause.probability > 50 ? styles.high : 
                      cause.probability > 30 ? styles.medium : styles.low
                    }`}>
                      {cause.probability}%
                    </span>
                  </div>
                  <div className={styles.causeMeta}>
                    <span>💰 {cause.cost}</span>
                    <span>📋 {cause.commonFor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.nextSteps && (
          <div className={styles.section}>
            <h4>📋 Empfohlene Schritte:</h4>
            <ol>
              {results.nextSteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {results.urgency && (
          <div className={`${styles.urgencySection} ${
            results.urgency.toLowerCase().includes('hoch') || results.urgency.toLowerCase().includes('sofort') 
              ? styles.urgencyHigh 
              : results.urgency.toLowerCase().includes('mittel') 
                ? styles.urgencyMedium 
                : styles.urgencyLow
          }`}>
            <strong>⚠️ Dringlichkeit:</strong> {results.urgency}
          </div>
        )}

        {results.vehicleSpecific && (
          <div className={styles.vehicleSpecific}>
            <h4>🚗 Fahrzeugspezifische Hinweise:</h4>
            <p>{results.vehicleSpecific}</p>
          </div>
        )}

        {debugInfo && (
          <details className={styles.debugInfo}>
            <summary>🔧 Debug Information</summary>
            <div>
              <strong>Modus:</strong> {getModeText(debugInfo.mode)}
              {debugInfo.modelUsed && <><br/><strong>Modell:</strong> {debugInfo.modelUsed}</>}
              <br/><strong>Zeitstempel:</strong> {debugInfo.timestamp}
              {debugInfo.error && <><br/><strong>Fehler:</strong> {debugInfo.error}</>}
            </div>
          </details>
        )}
      </div>
    );
  };

  // Render OBD2 Results
  const renderOBD2Results = () => {
    if (!obdResults) return null;

    return (
      <div className={styles.resultsCard}>
        <h3 className={styles.cardTitle}>🔧 OBD2-Diagnose Ergebnis</h3>
        
        <div className={styles.diagnosisSection}>
          <div className={styles.codeInfo}>
            <div><strong>Code:</strong> {obdCode.toUpperCase()}</div>
            <div><strong>Kategorie:</strong> {obdResults.category}</div>
            {obdCodeDecoded && (
              <div><strong>Beschreibung:</strong> {obdCodeDecoded.description}</div>
            )}
          </div>
          <p>{obdResults.diagnosis}</p>
        </div>

        {obdResults.symptoms && (
          <div className={styles.section}>
            <h4>🚨 Typische Symptome:</h4>
            <ul>
              {obdResults.symptoms.map((symptom, index) => (
                <li key={index}>{symptom}</li>
              ))}
            </ul>
          </div>
        )}

        {obdResults.possibleCauses && (
          <div className={styles.section}>
            <h4>🔍 Mögliche Ursachen:</h4>
            <div className={styles.causesGrid}>
              {obdResults.possibleCauses.map((cause, index) => (
                <div key={index} className={styles.causeCard}>
                  <div className={styles.causeHeader}>
                    <strong>{cause.cause}</strong>
                    <span className={`${styles.probabilityBadge} ${
                      cause.probability > 50 ? styles.high : 
                      cause.probability > 30 ? styles.medium : styles.low
                    }`}>
                      {cause.probability}%
                    </span>
                  </div>
                  <div className={styles.causeMeta}>
                    <span>💰 {cause.cost}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {obdResults.nextSteps && (
          <div className={styles.section}>
            <h4>📋 Empfohlene Schritte:</h4>
            <ol>
              {obdResults.nextSteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {obdResults.urgency && (
          <div className={`${styles.urgencySection} ${
            obdResults.urgency.includes('HOCH') ? styles.urgencyHigh : 
            obdResults.urgency.includes('MITTEL') ? styles.urgencyMedium : styles.urgencyLow
          }`}>
            <strong>⚠️ Dringlichkeit:</strong> {obdResults.urgency}
          </div>
        )}

        {debugInfo && (
          <details className={styles.debugInfo}>
            <summary>🔧 Debug Information</summary>
            <div>
              <strong>Modus:</strong> {getModeText(debugInfo.mode)}
              {debugInfo.modelUsed && <><br/><strong>Modell:</strong> {debugInfo.modelUsed}</>}
              <br/><strong>Zeitstempel:</strong> {debugInfo.timestamp}
              {debugInfo.error && <><br/><strong>Fehler:</strong> {debugInfo.error}</>}
            </div>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <img className={styles.logo} src="/logo.png" alt="Smart Repair Service" />
            <div>
              <h1 className={styles.title}>AI Car Diag</h1>
              <p className={styles.subtitle}>
                KI-gestützte Fahrzeugdiagnose 
              </p>
            </div>
          </div>
          <nav className={styles.nav} aria-label="Hauptnavigation">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`${styles.navButton} ${activeTab === item.id ? styles.navButtonActive : ''}`}
                aria-current={activeTab === item.id ? 'page' : undefined}
                onClick={() => openTab(item.id)}
              >
                <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                <span className={styles.navLabelShort}>{item.short}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {/* Error Messages */}
        {error && (
          <div className={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {/* Diagnose Tab */}
        {activeTab === 'diagnose' && (
          <div className={styles.grid}>
            <div>
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>🔍 Problem beschreiben</h2>

                {/* VIN ... */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Fahrzeug-Identifikationsnummer (VIN) - Optional
                    <span style={{color: '#9ca3af', fontWeight: 'normal'}}> | Für detaillierte Fahrzeugdaten</span>
                  </label>
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => handleVinChange(e.target.value)}
                    className={`${styles.vinInput} ${
                      vinDecoded?.isValid === true ? styles.vinValid : 
                      vinDecoded?.isValid === false ? styles.vinInvalid : ''
                    }`}
                    placeholder="z.B. WBAFR9C50BC123456 (17 Zeichen)"
                    maxLength="24"
                  />
                  
                  <VinInfo decoded={vinDecoded} styles={styles} />
                </div>

                {/* Car Details */}
                <div className={styles.carDetailsGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Marke</label>
                    <input
                      type="text"
                      value={carDetails.make}
                      onChange={(e) => setCarDetails({...carDetails, make: e.target.value})}
                      className={styles.input}
                      placeholder="z.B. BMW"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Modell</label>
                    <input
                      type="text"
                      value={carDetails.model}
                      onChange={(e) => setCarDetails({...carDetails, model: e.target.value})}
                      className={styles.input}
                      placeholder="z.B. 3er"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Baujahr</label>
                    <input
                      type="text"
                      value={carDetails.year}
                      onChange={(e) => setCarDetails({...carDetails, year: e.target.value})}
                      className={styles.input}
                      placeholder="z.B. 2020"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Motortyp</label>
                    <select
                      value={carDetails.engineType}
                      onChange={(e) => setCarDetails({...carDetails, engineType: e.target.value})}
                      className={styles.input}
                    >
                      <option value="">Bitte wählen</option>
                      <option value="benzin">Benzin</option>
                      <option value="diesel">Diesel</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="elektro">Elektro</option>
                    </select>
                  </div>
                </div>

                {/* Problem Description */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Problembeschreibung</label>
                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    rows={4}
                    className={styles.textarea}
                    placeholder="Beschreiben Sie das Problem so detailliert wie möglich...
Z.B: Das Fahrzeug macht beim Starten ein klickendes Geräusch, aber der Motor springt nicht an. Bei Dieselmotoren erwähnen Sie bitte auch AdBlue-Status oder DPF-Probleme..."
                  />
                </div>

                <button
                  onClick={analyzeWithAI}
                  disabled={loading || !problem.trim()}
                  className={`${styles.button} ${loading || !problem.trim() ? styles.buttonDisabled : ''}`}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner}></span>
                      KI analysiert...
                    </>
                  ) : (
                    <>🔍 Problem analysieren</>
                  )}
                </button>
              </div>
            </div>

            <div>
              {results ? renderDiagnosisResults() : (
                <div className={styles.placeholderCard}>
                  <div style={{fontSize: '4rem', marginBottom: '1rem'}}>🚗</div>
                  <h3>Bereit für die Diagnose</h3>
                  <p style={{color: '#9ca3af'}}>
                    Geben Sie Ihr Problem ein, wählen Sie den Motortyp und nutzen Sie optional die VIN für detaillierte Fahrzeugdaten.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mehrere Fehlercodes Tab */}
        {activeTab === 'multi' && (
          <MultiCodeAnalysis
            key={multiKey}
            initialCase={multiCase}
            onSave={saveCase}
          />
        )}

        {/* Geführte Fehlersuche Tab */}
        {activeTab === 'guided' && (
          <GuidedDiagnosis
            key={guidedKey}
            initialCase={guidedCase}
            onSave={saveCase}
          />
        )}

        {/* Verlauf Tab */}
        {activeTab === 'history' && (
          <CaseHistory refreshKey={historyVersion} onOpen={openCase} />
        )}

        {/* OBD2 Tab */}
        {activeTab === 'obd2' && (
          <div className={styles.grid}>
            <div>
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>🔧 OBD2-Fehlercode Diagnose</h2>

                {/* VIN ... für OBD2 */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Fahrzeug-Identifikationsnummer (VIN)
                    <span style={{color: '#9ca3af', fontWeight: 'normal'}}> | Für fahrzeugspezifische Diagnose</span>
                  </label>
                  <input
                    type="text"
                    value={obdVin}
                    onChange={(e) => handleObdVinChange(e.target.value)}
                    className={`${styles.vinInput} ${
                      obdVinDecoded?.isValid === true ? styles.vinValid : 
                      obdVinDecoded?.isValid === false ? styles.vinInvalid : ''
                    }`}
                    placeholder="z.B. WBAFR9C50BC123456 (17 Zeichen)"
                    maxLength="24"
                  />
                  
                  <VinInfo decoded={obdVinDecoded} styles={styles} />
                </div>

                {/* OBD2-Code ... */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    OBD2-Fehlercode
                    <span style={{color: '#9ca3af', fontWeight: 'normal'}}> | z.B. P0171, P0301, P0420</span>
                  </label>
                  <input
                    type="text"
                    value={obdCode}
                    onChange={(e) => handleObdCodeChange(e.target.value)}
                    className={`${styles.input} ${styles.obdCodeInput} ${
                      obdCodeDecoded && obdCode.length >= 4 ? styles.codeValid : ''
                    }`}
                    placeholder="z.B. P0171"
                    maxLength="6"
                  />
                  
                  {obdCodeDecoded && obdCode.length >= 4 && (
                    <div className={styles.codePreview}>
                      <div><strong>Beschreibung:</strong> {obdCodeDecoded.description}</div>
                      <div><strong>Kategorie:</strong> {obdCodeDecoded.category}</div>
                      <div>
                        <strong>Schweregrad:</strong>
                        <span className={`${styles.severityBadge} ${obdCodeDecoded.severity ? styles[obdCodeDecoded.severity.toLowerCase().replace(/[^a-z]/g, '')] : styles.unbekannt}`}>
                          {obdCodeDecoded.severity}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={analyzeOBD2}
                  disabled={loading || !obdCode.trim() || obdCode.length < 4 || !obdCodeDecoded}
                  className={`${styles.button} ${styles.obd2Button} ${loading || !obdCode.trim() || obdCode.length < 4 || !obdCodeDecoded ? styles.buttonDisabled : ''}`}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner}></span>
                      Analysiere OBD2-Code...
                    </>
                  ) : (
                    <>🔧 OBD2-Code analysieren</>
                  )}
                </button>
              </div>
            </div>

            <div>
              {obdResults ? renderOBD2Results() : (
                <div className={styles.placeholderCard}>
                  <div style={{fontSize: '4rem', marginBottom: '1rem'}}>🔧</div>
                  <h3>OBD2-Diagnose bereit</h3>
                  <p style={{color: '#9ca3af'}}>
                    Geben Sie die Fahrgestellnummer und den OBD2-Fehlercode ein für eine detaillierte Diagnose.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default KFZDiagnosePlatform;