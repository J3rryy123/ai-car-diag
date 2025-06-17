import React, { useState, useEffect, useCallback } from 'react';
import ENHANCED_VIN_DECODER from '../utils/vinDecoder';
import styles from '../styles/KFZDiagnosePlatform.module.css';

const KFZDiagnosePlatform = () => {
  const [problem, setProblem] = useState('');
  const [carDetails, setCarDetails] = useState({
    make: '',
    model: '',
    year: '',
    engineType: ''
  });
  const [vin, setVin] = useState('');
  const [vinDecoded, setVinDecoded] = useState(null);
  const [showVinDetails, setShowVinDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedAI, setSelectedAI] = useState('claude');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Historie-State mit Server-Sync
  const [searchHistory, setSearchHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('diagnose');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historySaving, setHistorySaving] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Historie vom Server laden
  const loadHistoryFromServer = useCallback(async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      
      const response = await fetch('/api/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.history || []);
        setLastSyncTime(new Date().toISOString());
        console.log(`Historie geladen: ${data.count} Einträge für User ${data.userId}`);
      } else {
        throw new Error(`Server-Fehler: ${response.status}`);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Historie:', error);
      setHistoryError('Historie konnte nicht geladen werden. Lokale Sitzung wird verwendet.');
      
      // Fallback: Versuche lokale Historie zu laden (falls verfügbar)
      try {
        const localHistory = localStorage.getItem('kfz-diagnose-history');
        if (localHistory) {
          setSearchHistory(JSON.parse(localHistory));
        }
      } catch (localError) {
        console.error('Lokale Historie nicht verfügbar:', localError);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Historie auf Server speichern
  const saveHistoryToServer = useCallback(async (historyToSave) => {
    try {
      setHistorySaving(true);
      
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: historyToSave
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastSyncTime(new Date().toISOString());
        console.log(`Historie gespeichert: ${data.count} Einträge`);
        
        // Backup lokal speichern
        try {
          localStorage.setItem('kfz-diagnose-history', JSON.stringify(historyToSave));
        } catch (localError) {
          console.log('Lokaler Backup-Speicher nicht verfügbar');
        }
        
        return true;
      } else {
        throw new Error(`Server-Fehler: ${response.status}`);
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Historie:', error);
      setHistoryError('Historie konnte nicht gespeichert werden.');
      
      // Fallback: Lokal speichern
      try {
        localStorage.setItem('kfz-diagnose-history', JSON.stringify(historyToSave));
        console.log('Historie lokal gespeichert (Fallback)');
      } catch (localError) {
        console.error('Auch lokales Speichern fehlgeschlagen:', localError);
      }
      
      return false;
    } finally {
      setHistorySaving(false);
    }
  }, []);

  // Historie komplett löschen (Server + Lokal)
  const clearHistoryComplete = useCallback(async () => {
    try {
      setHistorySaving(true);
      
      // Vom Server löschen
      const response = await fetch('/api/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('Server-Historie gelöscht');
      }
      
      // Lokal löschen
      try {
        localStorage.removeItem('kfz-diagnose-history');
      } catch (localError) {
        console.log('Lokale Historie bereits leer');
      }
      
      // State aktualisieren
      setSearchHistory([]);
      setLastSyncTime(new Date().toISOString());
      
    } catch (error) {
      console.error('Fehler beim Löschen der Historie:', error);
      setHistoryError('Historie konnte nicht vollständig gelöscht werden.');
    } finally {
      setHistorySaving(false);
    }
  }, []);

  // Komponente initialisieren
  useEffect(() => {
    loadHistoryFromServer();
  }, [loadHistoryFromServer]);

  // VIN-Dekodierung
  const handleVinChange = (inputVin) => {
    setVin(inputVin);
    if (inputVin.length >= 17) {
      const decoded = ENHANCED_VIN_DECODER.decodeVIN(inputVin);
      if (decoded && decoded.isValid) {
        setVinDecoded(decoded);
        setCarDetails(prev => ({
          ...prev,
          make: decoded.make !== 'Unbekannt' ? decoded.make : prev.make,
          model: decoded.series || prev.model,
          year: decoded.year !== 'Unbekannt' ? decoded.year.toString() : prev.year,
          engineType: decoded.engine || prev.engineType
        }));
      } else {
        setVinDecoded(decoded);
      }
    } else {
      setVinDecoded(null);
    }
  };

  const analyzeWithAI = async (aiModel) => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      const requestData = {
        problem,
        carDetails,
        aiModel,
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

      // Neuen Historie-Eintrag erstellen
      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        problem: problem,
        carDetails: { ...carDetails },
        vin: vin,
        vinDecoded: vinDecoded,
        aiModel: aiModel,
        results: data.analysis,
        debugInfo: {
          mode: data.mode,
          modelUsed: data.modelUsed
        }
      };

      // Historie aktualisieren
      const updatedHistory = [historyEntry, ...searchHistory.slice(0, 49)]; // Max 50 Einträge
      setSearchHistory(updatedHistory);
      
      // Auf Server speichern (asynchron)
      saveHistoryToServer(updatedHistory);

    } catch (err) {
      setError('Fehler bei der KI-Analyse. Bitte versuchen Sie es erneut.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem.trim()) return;
    await analyzeWithAI(selectedAI);
  };

  const loadHistoryItem = (historyItem) => {
    setProblem(historyItem.problem);
    setCarDetails(historyItem.carDetails);
    setVin(historyItem.vin || '');
    setVinDecoded(historyItem.vinDecoded || null);
    setSelectedAI(historyItem.aiModel);
    setResults(historyItem.results);
    setDebugInfo(historyItem.debugInfo);
    setActiveTab('diagnose');
  };

  const clearHistory = async () => {
    if (window.confirm('Möchten Sie wirklich die gesamte Historie löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      await clearHistoryComplete();
    }
  };

  const deleteHistoryItem = async (id) => {
    const updatedHistory = searchHistory.filter(item => item.id !== id);
    setSearchHistory(updatedHistory);
    await saveHistoryToServer(updatedHistory);
  };

  // Manuelle Synchronisation
  const manualSync = async () => {
    await loadHistoryFromServer();
  };

  // Utility functions
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
    if (mode === 'claude-fallback') return '⚠️ Claude API (Fallback)';
    if (mode === 'openai-fallback') return '⚠️ OpenAI API (Fallback)';
    if (mode.includes('demo')) return '⚠️ Demo-Modus';
    if (mode.includes('error')) return '❌ API-Fehler';
    return mode;
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderDiagnosisResults = () => {
    if (!results) return null;

    return (
      <div className={styles.resultsCard}>
        <div className={styles.resultsHeader}>
          <h2 className={styles.cardTitle}>✅ Diagnose-Ergebnis</h2>
          <span className={`${styles.aiModelBadge} ${selectedAI === 'claude' ? styles.claudeBadge : styles.chatgptBadge}`}>
            {selectedAI === 'claude' ? 'Claude 4' : 'ChatGPT'}
          </span>
        </div>

        {/* Diagnose Text */}
        <div className={styles.diagnosisText}>
          {results.diagnosis}
        </div>

        {/* Mögliche Ursachen */}
        {results.possibleCauses && results.possibleCauses.length > 0 && (
          <div className={styles.possibleCauses}>
            <h3>🔍 Mögliche Ursachen</h3>
            {results.possibleCauses.map((cause, index) => (
              <div key={index} className={styles.causeItem}>
                <div className={styles.causeName}>{cause.cause}</div>
                <div className={styles.causeDetails}>
                  <span>Wahrscheinlichkeit: {cause.probability}%</span>
                  <span>Kosten: {cause.cost}</span>
                  <span>{cause.commonFor}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nächste Schritte */}
        {results.nextSteps && results.nextSteps.length > 0 && (
          <div className={styles.nextSteps}>
            <h3>📋 Empfohlene Schritte</h3>
            <ul className={styles.stepsList}>
              {results.nextSteps.map((step, index) => (
                <li key={index} className={styles.stepItem}>
                  {index + 1}. {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dringlichkeit */}
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

        {/* Fahrzeugspezifische Hinweise */}
        {results.vehicleSpecific && (
          <div className={styles.vehicleSpecific}>
            <h4>🚗 Fahrzeugspezifische Hinweise:</h4>
            <p>{results.vehicleSpecific}</p>
          </div>
        )}

        {/* Debug Information */}
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
                KI-gestützte Fahrzeugdiagnose mit persistenter Historie
                {lastSyncTime && (
                  <span style={{fontSize: '0.8em', color: '#10b981'}}>
                    {' '}• Sync: {formatDate(lastSyncTime)}
                  </span>
                )}
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
              className={`${styles.navButton} ${activeTab === 'history' ? styles.navButtonActive : ''}`}
              onClick={() => setActiveTab('history')}
              disabled={historyLoading}
            >
              📋 Historie ({searchHistory.length})
              {historySaving && <span className={styles.spinner} style={{marginLeft: '0.5rem'}}></span>}
            </button>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {/* Error/Warning Messages */}
        {historyError && (
          <div className={styles.error}>
            ⚠️ {historyError}
            <button 
              onClick={manualSync} 
              style={{marginLeft: '1rem', background: 'none', border: '1px solid currentColor', borderRadius: '4px', padding: '0.25rem 0.5rem', color: 'inherit', cursor: 'pointer'}}
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {activeTab === 'diagnose' ? (
          <div className={styles.grid}>
            {/* Eingabebereich */}
            <div>
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>
                  🔍 Problem beschreiben
                </h2>

                {/* Enhanced VIN-Eingabe */}
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
                        <>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div>
                              <strong>✅ VIN gültig</strong> - {vinDecoded.make} ({vinDecoded.country})
                              {vinDecoded.year !== 'Unbekannt' && `, Baujahr: ${vinDecoded.year}`}
                              {vinDecoded.series && ` | ${vinDecoded.series}`}
                              {vinDecoded.generation && ` (${vinDecoded.generation})`}
                            </div>
                            <button 
                              className={styles.detailsButton}
                              onClick={() => setShowVinDetails(!showVinDetails)}
                            >
                              {showVinDetails ? 'Weniger' : 'Details'}
                            </button>
                          </div>
                          
                          {vinDecoded.vehicleAge && (
                            <div style={{marginTop: '0.5rem', color: '#6b7280'}}>
                              Fahrzeugalter: {vinDecoded.vehicleAge} Jahre
                              {vinDecoded.isClassic && ' (Oldtimer)'}
                              {vinDecoded.isModern && ' (Neufahrzeug)'}
                              {vinDecoded.estimatedSpecs?.serviceInterval && ` | Service: ${vinDecoded.estimatedSpecs.serviceInterval}`}
                            </div>
                          )}
                          
                          {showVinDetails && (
                            <div className={styles.detailsPanel}>
                              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
                                <div>
                                  <strong>Grunddaten:</strong><br/>
                                  Hersteller: {vinDecoded.make}<br/>
                                  Land: {vinDecoded.country}<br/>
                                  Typ: {vinDecoded.vehicleType}<br/>
                                  {vinDecoded.series && `Serie: ${vinDecoded.series}`}<br/>
                                  {vinDecoded.generation && `Generation: ${vinDecoded.generation}`}
                                </div>
                                
                                <div>
                                  <strong>Produktion:</strong><br/>
                                  Jahr: {vinDecoded.year}<br/>
                                  Werk: {vinDecoded.assemblyPlant}<br/>
                                  {vinDecoded.productionYears && `Zeitraum: ${vinDecoded.productionYears}`}<br/>
                                  Vertrauen: {vinDecoded.confidence}
                                </div>
                                
                                {vinDecoded.estimatedSpecs && (
                                  <div>
                                    <strong>Technische Daten:</strong><br/>
                                    Emission: {vinDecoded.estimatedSpecs.emissionStandard}<br/>
                                    {vinDecoded.estimatedSpecs.serviceInterval && `Service: ${vinDecoded.estimatedSpecs.serviceInterval}`}<br/>
                                    {vinDecoded.estimatedSpecs.commonIssues && (
                                      <>
                                        <br/><strong>Bekannte Probleme:</strong><br/>
                                        <ul style={{margin: '0.25rem 0', paddingLeft: '1rem', fontSize: '0.8rem'}}>
                                          {vinDecoded.estimatedSpecs.commonIssues.map((issue, i) => (
                                            <li key={i}>{issue}</li>
                                          ))}
                                        </ul>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <strong>❌ Ungültige VIN</strong>
                          <div style={{marginTop: '0.5rem'}}>
                            {vinDecoded.error || 'Bitte 17 Zeichen eingeben (keine I, O, Q)'}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Fahrzeugdaten */}
                <div className={styles.formGroup}>
                  <div className={styles.formGrid}>
                    <div>
                      <label className={styles.label}>Marke</label>
                      <input
                        type="text"
                        value={carDetails.make}
                        onChange={(e) => setCarDetails({...carDetails, make: e.target.value})}
                        className={styles.input}
                        placeholder="z.B. BMW"
                      />
                    </div>
                    <div>
                      <label className={styles.label}>Modell</label>
                      <input
                        type="text"
                        value={carDetails.model}
                        onChange={(e) => setCarDetails({...carDetails, model: e.target.value})}
                        className={styles.input}
                        placeholder="z.B. 3er"
                      />
                    </div>
                    <div>
                      <label className={styles.label}>Baujahr</label>
                      <input
                        type="number"
                        value={carDetails.year}
                        onChange={(e) => setCarDetails({...carDetails, year: e.target.value})}
                        className={styles.input}
                        placeholder="2020"
                      />
                    </div>
                    <div>
                      <label className={styles.label}>Motortyp</label>
                      <input
                        type="text"
                        value={carDetails.engineType}
                        onChange={(e) => setCarDetails({...carDetails, engineType: e.target.value})}
                        className={styles.input}
                        placeholder="z.B. 2.0 TDI, 1.8 TSI, 320d"
                        list="engineTypes"
                      />
                      <datalist id="engineTypes">
                        <option value="1.0 TSI" />
                        <option value="1.2 TSI" />
                        <option value="1.4 TSI" />
                        <option value="1.5 TSI" />
                        <option value="1.6 TDI" />
                        <option value="1.8 TSI" />
                        <option value="2.0 TSI" />
                        <option value="2.0 TDI" />
                        <option value="2.0 TFSI" />
                        <option value="3.0 TDI" />
                        <option value="316i" />
                        <option value="318i" />
                        <option value="320i" />
                        <option value="320d" />
                        <option value="330i" />
                        <option value="A160" />
                        <option value="A180" />
                        <option value="A200" />
                        <option value="C180" />
                        <option value="C200" />
                        <option value="C220d" />
                        <option value="E200" />
                        <option value="E220d" />
                        <option value="1.6i" />
                        <option value="2.0i" />
                        <option value="3.0i" />
                        <option value="Hybrid" />
                        <option value="Elektro" />
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* KI-Modell Auswahl */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>KI-Modell wählen</label>
                  <div className={styles.radioGroup}>
                    <div 
                      className={`${styles.radioOption} ${selectedAI === 'claude' ? styles.radioSelected : ''}`}
                      onClick={() => setSelectedAI('claude')}
                    >
                      🤖 Claude 4
                    </div>
                    <div 
                      className={`${styles.radioOption} ${selectedAI === 'chatgpt' ? styles.radioSelected : ''}`}
                      onClick={() => setSelectedAI('chatgpt')}
                    >
                      🤖 ChatGPT
                    </div>
                  </div>
                </div>

                {/* Problembeschreibung */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Problembeschreibung</label>
                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    className={styles.textarea}
                    placeholder="Beschreiben Sie das Problem möglichst detailliert. Z.B: Das Auto macht beim Starten ein klickendes Geräusch, aber der Motor springt nicht an. Bei Dieselmotoren erwähnen Sie bitte auch AdBlue-Status oder DPF-Probleme..."
                  />
                </div>

                {error && (
                  <div className={styles.error}>
                    ⚠️ {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading || !problem.trim()}
                  className={`${styles.button} ${loading || !problem.trim() ? styles.buttonDisabled : ''}`}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner}></span>
                      KI analysiert...
                    </>
                  ) : (
                    <>
                      🔍 Problem analysieren
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Ergebnisbereich */}
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
        ) : (
          /* Historie-Tab */
          <div className={styles.card}>
            <div className={styles.historyItemHeader}>
              <h2 className={styles.cardTitle}>
                📋 Diagnose-Historie
                {historyLoading && <span className={styles.spinner} style={{marginLeft: '1rem'}}></span>}
              </h2>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <button 
                  onClick={manualSync}
                  disabled={historyLoading || historySaving}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: historyLoading || historySaving ? 'not-allowed' : 'pointer'
                  }}
                >
                  🔄 Sync
                </button>
                {searchHistory.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    disabled={historySaving}
                    className={styles.deleteButton}
                  >
                    Alle löschen
                  </button>
                )}
              </div>
            </div>
            
            {historyLoading ? (
              <div style={{textAlign: 'center', padding: '3rem', color: '#6b7280'}}>
                <div className={styles.spinner} style={{margin: '0 auto 1rem'}}></div>
                <p>Historie wird geladen...</p>
              </div>
            ) : searchHistory.length === 0 ? (
              <div className={styles.emptyState}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📋</div>
                <h3>Keine Historie vorhanden</h3>
                <p>Ihre durchgeführten Diagnosen werden hier dauerhaft gespeichert.</p>
              </div>
            ) : (
              <div className={styles.historyContainer}>
                {searchHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className={styles.historyItem} 
                    onClick={() => loadHistoryItem(item)}
                  >
                    <div className={styles.historyItemHeader}>
                      <div className={styles.historyMetadata}>
                        {formatDate(item.timestamp)} | {item.aiModel === 'claude' ? '🤖 Claude' : '🤖 ChatGPT'}
                        {item.vinDecoded && ` | VIN: ${item.vinDecoded.make} ${item.vinDecoded.series || ''}`}
                        {item.debugInfo?.mode && ` | ${getModeText(item.debugInfo.mode)}`}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(item.id);
                        }}
                        disabled={historySaving}
                        className={styles.deleteButton}
                      >
                        Löschen
                      </button>
                    </div>
                    <div className={styles.historyProblem}>
                      {item.problem.length > 100 ? `${item.problem.substring(0, 100)}...` : item.problem}
                    </div>
                    <div className={styles.historyCarDetails}>
                      {item.carDetails.make} {item.carDetails.model} ({item.carDetails.year})
                      {item.carDetails.engineType && ` - ${item.carDetails.engineType}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default KFZDiagnosePlatform;