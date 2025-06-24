// components/KFZDiagnosePlatform.js
import React, { useState } from 'react';
import ENHANCED_VIN_DECODER from '../utils/vinDecoder';
import OBD2_DECODER from '../utils/obdDecoder';
import styles from '../styles/KFZDiagnosePlatform.module.css';

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
  const [selectedAI, setSelectedAI] = useState('claude');
  
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

  // VIN Dekodierung für Diagnose Tab
  const handleVinChange = (inputVin) => {
    setVin(inputVin);
    if (inputVin.length >= 17) {
      const decoded = ENHANCED_VIN_DECODER.decodeVIN(inputVin);
      setVinDecoded(decoded);
      if (decoded && decoded.isValid) {
        setCarDetails(prev => ({
          ...prev,
          make: decoded.make !== 'Unbekannt' ? decoded.make : prev.make,
          model: decoded.series || prev.model,
          year: decoded.year !== 'Unbekannt' ? decoded.year.toString() : prev.year,
          engineType: decoded.engine || prev.engineType
        }));
      }
    } else {
      setVinDecoded(null);
    }
  };

  // VIN Dekodierung für OBD2 Tab
  const handleObdVinChange = (inputVin) => {
    setObdVin(inputVin);
    if (inputVin.length >= 17) {
      const decoded = ENHANCED_VIN_DECODER.decodeVIN(inputVin);
      setObdVinDecoded(decoded);
    } else {
      setObdVinDecoded(null);
    }
  };

  // OBD2 Code Dekodierung
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
        aiModel: selectedAI,
        vin: vin || null,
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
        obdVin: obdVin || null,
        obdVinDecoded: obdVinDecoded || null,
        codeInfo: obdCodeDecoded,
        aiModel: selectedAI  // AI-Modell für OBD2 hinzufügen
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
      
      // Debug-Informationen auch für OBD2 setzen
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

  // Utility Functions
  const getModeColor = (mode) => {
    if (mode && mode.includes('demo')) return '#f59e0b';
    if (mode === 'claude' || mode === 'openai') return '#16a34a';
    if (mode === 'claude-fallback' || mode === 'openai-fallback') return '#0891b2';
    return '#6b7280';
  };

  const getModeText = (mode) => {
    if (!mode) return 'Unbekannt';
    if (mode === 'claude') return '✅ Echte Claude API';
    if (mode === 'openai') return '✅ Echte OpenAI API';
    if (mode === 'claude-obd2') return '✅ Claude OBD2-Analyse';
    if (mode === 'openai-obd2') return '✅ OpenAI OBD2-Analyse';
    if (mode === 'claude-fallback') return '⚠️ Claude API (Fallback)';
    if (mode === 'openai-fallback') return '⚠️ OpenAI API (Fallback)';
    if (mode === 'claude-obd2-fallback') return '⚠️ Claude OBD2 (Fallback)';
    if (mode === 'openai-obd2-fallback') return '⚠️ OpenAI OBD2 (Fallback)';
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
          <span className={`${styles.aiModelBadge} ${selectedAI === 'claude' ? styles.claudeBadge : styles.chatgptBadge}`}>
            {selectedAI === 'claude' ? '🤖 Claude' : '🤖 ChatGPT'}
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
            <div className={styles.headerIcon}>🚗</div>
            <div>
              <h1 className={styles.title}>KFZ-Diagnose Platform</h1>
              <p className={styles.subtitle}>
                KI-gestützte Fahrzeugdiagnose mit OBD2-Unterstützung
              </p>
            </div>
          </div>
          <nav className={styles.nav}>
            <button
              className={`${styles.navButton} ${activeTab === 'diagnose' ? styles.navButtonActive : ''}`}
              onClick={() => setActiveTab('diagnose')}
            >
              🔍 Diagnose
            </button>
            <button
              className={`${styles.navButton} ${activeTab === 'obd2' ? styles.navButtonActive : ''}`}
              onClick={() => setActiveTab('obd2')}
            >
              🔧 OBD2-Diagnose
            </button>
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

                {/* VIN Eingabe */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Fahrzeug-Identifikationsnummer (VIN) - Optional
                    <span style={{color: '#6b7280', fontWeight: 'normal'}}> | Für detaillierte Fahrzeugdaten</span>
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
                    maxLength="17"
                  />
                  
                  {vinDecoded && (
                    <div className={`${styles.vinInfo} ${
                      vinDecoded.isValid ? styles.vinInfoValid : styles.vinInfoInvalid
                    }`}>
                      {vinDecoded.isValid ? (
                        <div>
                          <div><strong>Hersteller:</strong> {vinDecoded.make}</div>
                          <div><strong>Serie:</strong> {vinDecoded.series}</div>
                          <div><strong>Jahr:</strong> {vinDecoded.year}</div>
                          <div><strong>Land:</strong> {vinDecoded.country}</div>
                        </div>
                      ) : (
                        <div style={{color: '#dc2626'}}>
                          ❌ {vinDecoded.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Fahrzeugdetails */}
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

                {/* AI Model Selection - Card Version */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>KI-Modell wählen</label>
                  <div className={styles.aiSelectorContainer}>
                    <div 
                      className={`${styles.aiCard} ${selectedAI === 'claude' ? styles.aiCardActive : ''}`}
                      onClick={() => setSelectedAI('claude')}
                    >
                      <div className={styles.aiCardHeader}>
                        <div className={styles.aiIcon}>🤖</div>
                        <div className={styles.aiInfo}>
                          <div className={styles.aiName}>Claude</div>
                          <div className={styles.aiProvider}>Anthropic</div>
                        </div>
                        <div className={styles.aiRadio}>
                          <input
                            type="radio"
                            name="aiModel"
                            value="claude"
                            checked={selectedAI === 'claude'}
                            onChange={() => setSelectedAI('claude')}
                            className={styles.radioInput}
                          />
                          <div className={styles.radioCustom}></div>
                        </div>
                      </div>
                      <div className={styles.aiDescription}>
                        Spezialisiert auf detaillierte technische Analysen und präzise Fahrzeugdiagnosen
                      </div>
                      <div className={styles.aiFeatures}>
                        <span className={styles.aiFeature}>🔍 Detailanalyse</span>
                        <span className={styles.aiFeature}>🎯 Präzise Diagnosen</span>
                      </div>
                    </div>

                    <div 
                      className={`${styles.aiCard} ${selectedAI === 'chatgpt' ? styles.aiCardActive : ''}`}
                      onClick={() => setSelectedAI('chatgpt')}
                    >
                      <div className={styles.aiCardHeader}>
                        <div className={styles.aiIcon}>🤖</div>
                        <div className={styles.aiInfo}>
                          <div className={styles.aiName}>ChatGPT</div>
                          <div className={styles.aiProvider}>OpenAI</div>
                        </div>
                        <div className={styles.aiRadio}>
                          <input
                            type="radio"
                            name="aiModel"
                            value="chatgpt"
                            checked={selectedAI === 'chatgpt'}
                            onChange={() => setSelectedAI('chatgpt')}
                            className={styles.radioInput}
                          />
                          <div className={styles.radioCustom}></div>
                        </div>
                      </div>
                      <div className={styles.aiDescription}>
                        Vielseitige KI mit breitem Autowissen und praktischen Lösungsansätzen
                      </div>
                      <div className={styles.aiFeatures}>
                        <span className={styles.aiFeature}>💡 Praktische Tipps</span>
                        <span className={styles.aiFeature}>🔧 Breites Wissen</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Problembeschreibung */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Problembeschreibung</label>
                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    rows={4}
                    className={styles.textarea}
                    placeholder="Beschreiben Sie das Problem so detailliert wie möglich...
Z.B: Das Auto macht beim Starten ein klickendes Geräusch, aber der Motor springt nicht an. Bei Dieselmotoren erwähnen Sie bitte auch AdBlue-Status oder DPF-Probleme..."
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
                  <p style={{color: '#6b7280'}}>
                    Geben Sie Ihr KFZ-Problem ein, wählen Sie den Motortyp und nutzen Sie optional die VIN für detaillierte Fahrzeugdaten.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* OBD2 Tab */}
        {activeTab === 'obd2' && (
          <div className={styles.grid}>
            <div>
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>🔧 OBD2-Fehlercode Diagnose</h2>

                {/* VIN Eingabe für OBD2 */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Fahrzeug-Identifikationsnummer (VIN)
                    <span style={{color: '#6b7280', fontWeight: 'normal'}}> | Für fahrzeugspezifische Diagnose</span>
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
                    maxLength="17"
                  />
                  
                  {obdVinDecoded && (
                    <div className={`${styles.vinInfo} ${
                      obdVinDecoded.isValid ? styles.vinInfoValid : styles.vinInfoInvalid
                    }`}>
                      {obdVinDecoded.isValid ? (
                        <div>
                          <div><strong>Fahrzeug:</strong> {obdVinDecoded.make} {obdVinDecoded.series}</div>
                          <div><strong>Baujahr:</strong> {obdVinDecoded.year}</div>
                        </div>
                      ) : (
                        <div style={{color: '#dc2626'}}>
                          ❌ {obdVinDecoded.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* OBD2-Code Eingabe */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    OBD2-Fehlercode
                    <span style={{color: '#6b7280', fontWeight: 'normal'}}> | z.B. P0171, P0301, P0420</span>
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
                  <p style={{color: '#6b7280'}}>
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