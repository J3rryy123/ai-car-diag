import React, { useState, useEffect } from 'react';

// VIN-Dekodierungs-Utilities
const VIN_DECODER = {
  // Vereinfachte VIN-Dekodierung (erste 3 Zeichen = WMI - World Manufacturer Identifier)
  manufacturers: {
    'WBA': { make: 'BMW', country: 'Deutschland' },
    'WBS': { make: 'BMW', country: 'Deutschland' },
    'WAU': { make: 'Audi', country: 'Deutschland' },
    'WVW': { make: 'Volkswagen', country: 'Deutschland' },
    'WDB': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'WDD': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'VSS': { make: 'SEAT', country: 'Spanien' },
    'VF3': { make: 'Peugeot', country: 'Frankreich' },
    'VF7': { make: 'Citroën', country: 'Frankreich' },
    'YV1': { make: 'Volvo', country: 'Schweden' },
    'JHM': { make: 'Honda', country: 'Japan' },
    'JTD': { make: 'Toyota', country: 'Japan' },
    '1HD': { make: 'Harley-Davidson', country: 'USA' },
    '1G1': { make: 'Chevrolet', country: 'USA' },
    '1FA': { make: 'Ford', country: 'USA' },
    'SCC': { make: 'Lotus', country: 'Großbritannien' },
    'SAJ': { make: 'Jaguar', country: 'Großbritannien' },
    'SAL': { make: 'Land Rover', country: 'Großbritannien' },
  },

  validateVIN: (vin) => {
    if (!vin) return false;
    const cleanVIN = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase();
    return cleanVIN.length === 17;
  },

  decodeVIN: (vin) => {
    if (!VIN_DECODER.validateVIN(vin)) return null;
    
    const cleanVIN = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase();
    const wmi = cleanVIN.substring(0, 3);
    const yearCode = cleanVIN.charAt(9);
    
    // Jahr dekodieren (vereinfacht)
    const yearMap = {
      'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
      'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
      'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026, 'V': 2027,
      'W': 2028, 'X': 2029, 'Y': 2030, 'Z': 2031,
      '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
      '6': 2006, '7': 2007, '8': 2008, '9': 2009
    };

    const manufacturer = VIN_DECODER.manufacturers[wmi];
    const year = yearMap[yearCode];

    return {
      vin: cleanVIN,
      make: manufacturer?.make || 'Unbekannt',
      country: manufacturer?.country || 'Unbekannt',
      year: year || 'Unbekannt',
      wmi: wmi,
      isValid: true
    };
  }
};

const KFZDiagnosePlatform = () => {
  const [problem, setProblem] = useState('');
  const [carDetails, setCarDetails] = useState({
    make: '',
    model: '',
    year: '',
    mileage: ''
  });
  const [vin, setVin] = useState('');
  const [vinDecoded, setVinDecoded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedAI, setSelectedAI] = useState('claude');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Historie-State
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('diagnose'); // 'diagnose', 'history'

  // VIN-Validierung und Dekodierung
  const handleVinChange = (inputVin) => {
    setVin(inputVin);
    if (inputVin.length >= 17) {
      const decoded = VIN_DECODER.decodeVIN(inputVin);
      if (decoded) {
        setVinDecoded(decoded);
        setCarDetails(prev => ({
          ...prev,
          make: decoded.make !== 'Unbekannt' ? decoded.make : prev.make,
          year: decoded.year !== 'Unbekannt' ? decoded.year.toString() : prev.year
        }));
      } else {
        setVinDecoded({ isValid: false });
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
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem,
          carDetails,
          aiModel
        }),
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

      // Historie aktualisieren
      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        problem: problem,
        carDetails: { ...carDetails },
        vin: vin,
        aiModel: aiModel,
        results: data.analysis,
        debugInfo: {
          mode: data.mode,
          modelUsed: data.modelUsed
        }
      };

      setSearchHistory(prev => [historyEntry, ...prev.slice(0, 9)]); // Nur die letzten 10 behalten

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
    setSelectedAI(historyItem.aiModel);
    setResults(historyItem.results);
    setDebugInfo(historyItem.debugInfo);
    setActiveTab('diagnose');
  };

  const clearHistory = () => {
    setSearchHistory([]);
  };

  const deleteHistoryItem = (id) => {
    setSearchHistory(prev => prev.filter(item => item.id !== id));
  };

  // Bestimme die Farbe basierend auf dem Modus
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

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      background: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '1.5rem 0',
      borderBottom: '1px solid #e5e7eb'
    },
    headerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    headerIcon: {
      background: '#2563eb',
      padding: '0.75rem',
      borderRadius: '12px',
      fontSize: '1.5rem',
      color: 'white'
    },
    title: {
      fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: 0
    },
    subtitle: {
      color: '#6b7280',
      fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
      margin: 0
    },
    nav: {
      display: 'flex',
      gap: '1rem'
    },
    navButton: {
      padding: '0.5rem 1rem',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      background: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '0.875rem',
      fontWeight: '500'
    },
    navButtonActive: {
      borderColor: '#2563eb',
      background: '#eff6ff',
      color: '#1d4ed8'
    },
    main: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem 1rem'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '2rem'
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
      padding: '1.5rem',
      border: '1px solid #f3f4f6'
    },
    cardTitle: {
      fontSize: '1.5rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '1rem'
    },
    label: {
      display: 'block',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '0.5rem',
      fontSize: '0.9rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '1rem',
      outline: 'none',
      transition: 'all 0.2s'
    },
    vinInput: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '1rem',
      outline: 'none',
      transition: 'all 0.2s',
      fontFamily: 'monospace',
      textTransform: 'uppercase'
    },
    vinValid: {
      borderColor: '#16a34a',
      background: '#f0fdf4'
    },
    vinInvalid: {
      borderColor: '#dc2626',
      background: '#fef2f2'
    },
    vinInfo: {
      padding: '0.75rem',
      borderRadius: '8px',
      marginTop: '0.5rem',
      fontSize: '0.875rem'
    },
    vinInfoValid: {
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      color: '#15803d'
    },
    vinInfoInvalid: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626'
    },
    textarea: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '1rem',
      outline: 'none',
      resize: 'vertical',
      minHeight: '120px',
      fontFamily: 'inherit'
    },
    radioGroup: {
      display: 'flex',
      gap: '1rem',
      flexWrap: 'wrap'
    },
    radioOption: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1rem',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      flex: '1',
      minWidth: '120px',
      justifyContent: 'center'
    },
    radioSelected: {
      borderColor: '#2563eb',
      background: '#eff6ff',
      color: '#1d4ed8'
    },
    button: {
      width: '100%',
      background: '#2563eb',
      color: 'white',
      border: 'none',
      padding: '1rem 1.5rem',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      fontSize: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    buttonDisabled: {
      background: '#9ca3af',
      cursor: 'not-allowed'
    },
    buttonSecondary: {
      background: '#6b7280',
      color: 'white'
    },
    buttonDanger: {
      background: '#dc2626',
      color: 'white'
    },
    error: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '1rem',
      color: '#dc2626',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '1rem'
    },
    historyContainer: {
      maxHeight: '70vh',
      overflowY: 'auto'
    },
    historyItem: {
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    historyItemHover: {
      background: '#f3f4f6',
      borderColor: '#d1d5db'
    },
    historyHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '0.5rem'
    },
    historyMeta: {
      fontSize: '0.75rem',
      color: '#6b7280'
    },
    historyProblem: {
      fontSize: '0.875rem',
      color: '#374151',
      fontWeight: '500',
      marginBottom: '0.5rem'
    },
    historyDetails: {
      fontSize: '0.75rem',
      color: '#6b7280'
    },
    deleteButton: {
      background: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '0.25rem 0.5rem',
      fontSize: '0.75rem',
      cursor: 'pointer'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem',
      color: '#6b7280'
    },
    // ... (alle anderen Styles bleiben gleich)
    debugInfo: {
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem',
      fontSize: '0.875rem'
    },
    debugTitle: {
      fontWeight: '600',
      marginBottom: '0.5rem',
      color: '#374151'
    },
    modeIndicator: {
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: '500',
      marginLeft: '0.5rem'
    },
    resultsCard: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
      padding: '1.5rem',
      border: '1px solid #f3f4f6'
    },
    badge: {
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: '500',
      marginLeft: 'auto'
    },
    confidenceContainer: {
      background: '#f9fafb',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1.5rem'
    },
    confidenceBar: {
      width: '100%',
      height: '8px',
      background: '#e5e7eb',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '0.5rem'
    },
    confidenceFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #10b981, #2563eb)',
      transition: 'width 1s ease-in-out'
    },
    sectionTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    causeItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      background: '#f9fafb',
      borderRadius: '8px',
      marginBottom: '0.5rem'
    },
    stepList: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    stepItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      marginBottom: '0.75rem'
    },
    stepNumber: {
      width: '24px',
      height: '24px',
      background: '#2563eb',
      color: 'white',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '0.75rem',
      flexShrink: 0
    },
    urgencyAlert: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '1rem',
      color: '#dc2626'
    },
    placeholderCard: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
      padding: '3rem',
      border: '1px solid #f3f4f6',
      textAlign: 'center'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>🚗</div>
            <div>
              <h1 style={styles.title}>KFZ-Diagnose Platform</h1>
              <p style={styles.subtitle}>KI-gestützte Fahrzeugdiagnose mit Claude & ChatGPT</p>
            </div>
          </div>
          <nav style={styles.nav}>
            <button
              style={{
                ...styles.navButton,
                ...(activeTab === 'diagnose' ? styles.navButtonActive : {})
              }}
              onClick={() => setActiveTab('diagnose')}
            >
              🔍 Diagnose
            </button>
            <button
              style={{
                ...styles.navButton,
                ...(activeTab === 'history' ? styles.navButtonActive : {})
              }}
              onClick={() => setActiveTab('history')}
            >
              📋 Historie ({searchHistory.length})
            </button>
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        {activeTab === 'diagnose' ? (
          <div style={styles.grid}>
            {/* Eingabebereich */}
            <div>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  🔍 Problem beschreiben
                </h2>

                {/* VIN-Eingabe */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fahrzeug-Identifikationsnummer (VIN) - Optional</label>
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => handleVinChange(e.target.value)}
                    style={{
                      ...styles.vinInput,
                      ...(vinDecoded?.isValid === true ? styles.vinValid : {}),
                      ...(vinDecoded?.isValid === false ? styles.vinInvalid : {})
                    }}
                    placeholder="z.B. WBAFR9C50BC123456"
                    maxLength="17"
                  />
                  {vinDecoded && (
                    <div style={{
                      ...styles.vinInfo,
                      ...(vinDecoded.isValid ? styles.vinInfoValid : styles.vinInfoInvalid)
                    }}>
                      {vinDecoded.isValid ? (
                        <>
                          ✅ VIN gültig - {vinDecoded.make} ({vinDecoded.country})
                          {vinDecoded.year !== 'Unbekannt' && `, Baujahr: ${vinDecoded.year}`}
                        </>
                      ) : (
                        '❌ Ungültige VIN - Bitte überprüfen Sie die Eingabe'
                      )}
                    </div>
                  )}
                </div>

                {/* Fahrzeugdaten */}
                <div style={styles.formGroup}>
                  <div style={styles.formGrid}>
                    <div>
                      <label style={styles.label}>Marke</label>
                      <input
                        type="text"
                        value={carDetails.make}
                        onChange={(e) => setCarDetails({...carDetails, make: e.target.value})}
                        style={styles.input}
                        placeholder="z.B. BMW"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Modell</label>
                      <input
                        type="text"
                        value={carDetails.model}
                        onChange={(e) => setCarDetails({...carDetails, model: e.target.value})}
                        style={styles.input}
                        placeholder="z.B. 3er"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Baujahr</label>
                      <input
                        type="number"
                        value={carDetails.year}
                        onChange={(e) => setCarDetails({...carDetails, year: e.target.value})}
                        style={styles.input}
                        placeholder="2020"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Kilometerstand</label>
                      <input
                        type="number"
                        value={carDetails.mileage}
                        onChange={(e) => setCarDetails({...carDetails, mileage: e.target.value})}
                        style={styles.input}
                        placeholder="50000"
                      />
                    </div>
                  </div>
                </div>

                {/* KI-Modell Auswahl */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>KI-Modell wählen</label>
                  <div style={styles.radioGroup}>
                    <div 
                      style={{
                        ...styles.radioOption,
                        ...(selectedAI === 'claude' ? styles.radioSelected : {})
                      }}
                      onClick={() => setSelectedAI('claude')}
                    >
                      🤖 Claude 4
                    </div>
                    <div 
                      style={{
                        ...styles.radioOption,
                        ...(selectedAI === 'chatgpt' ? styles.radioSelected : {})
                      }}
                      onClick={() => setSelectedAI('chatgpt')}
                    >
                      🤖 ChatGPT
                    </div>
                  </div>
                </div>

                {/* Problembeschreibung */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Problembeschreibung</label>
                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    style={styles.textarea}
                    placeholder="Beschreiben Sie das Problem möglichst detailliert. Z.B: Das Auto macht beim Starten ein klickendes Geräusch, aber der Motor springt nicht an..."
                  />
                </div>

                {error && (
                  <div style={styles.error}>
                    ⚠️ {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading || !problem.trim()}
                  style={{
                    ...styles.button,
                    ...(loading || !problem.trim() ? styles.buttonDisabled : {})
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        border: '2px solid transparent',
                        borderTop: '2px solid currentColor',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        animation: 'spin 1s linear infinite'
                      }}></span>
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
              {results ? (
                <div style={styles.resultsCard}>
                  <div style={{...styles.cardTitle, justifyContent: 'space-between'}}>
                    <span>✅ Diagnose-Ergebnis</span>
                    <span style={{
                      ...styles.badge,
                      background: selectedAI === 'claude' ? '#dbeafe' : '#dcfce7',
                      color: selectedAI === 'claude' ? '#1d4ed8' : '#16a34a'
                    }}>
                      {selectedAI === 'claude' ? 'Claude 4' : 'ChatGPT'}
                    </span>
                  </div>

                  {/* Debug-Informationen */}
                  {debugInfo && (
                    <div style={styles.debugInfo}>
                      <div style={styles.debugTitle}>🔧 System-Status</div>
                      <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem'}}>
                        <span>Status:</span>
                        <span style={{
                          ...styles.modeIndicator,
                          background: getModeColor(debugInfo.mode),
                          color: 'white'
                        }}>
                          {getModeText(debugInfo.mode)}
                        </span>
                      </div>
                      {debugInfo.debug && (
                        <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem'}}>
                          Claude API: {debugInfo.debug.hasClaudeKey ? '✅' : '❌'} | 
                          OpenAI API: {debugInfo.debug.hasOpenAIKey ? '✅' : '❌'} | 
                          Umgebung: {debugInfo.debug.environment}
                          {debugInfo.modelUsed && (
                            <div style={{marginTop: '0.25rem'}}>
                              Verwendetes Modell: <strong>{debugInfo.modelUsed}</strong>
                            </div>
                          )}
                        </div>
                      )}
                      {debugInfo.error && (
                        <div style={{color: '#dc2626', fontSize: '0.75rem', marginTop: '0.5rem'}}>
                          Fehler: {debugInfo.error}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rest des Ergebnis-Bereichs bleibt gleich */}
                  <div style={styles.confidenceContainer}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{fontWeight: '500', color: '#374151'}}>Vertrauen der Analyse</span>
                      <span style={{fontSize: '1.25rem', fontWeight: '600'}}>{results.confidence}%</span>
                    </div>
                    <div style={styles.confidenceBar}>
                      <div 
                        style={{
                          ...styles.confidenceFill,
                          width: `${results.confidence}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div style={{marginBottom: '1.5rem'}}>
                    <h4 style={styles.sectionTitle}>🔍 Diagnose</h4>
                    <p style={{color: '#374151', lineHeight: '1.6'}}>{results.diagnosis}</p>
                  </div>

                  <div style={{marginBottom: '1.5rem'}}>
                    <h4 style={styles.sectionTitle}>🔧 Mögliche Ursachen</h4>
                    {results.possibleCauses.map((cause, index) => (
                      <div key={index} style={styles.causeItem}>
                        <div>
                          <div style={{fontWeight: '500', color: '#1f2937'}}>{cause.cause}</div>
                          <div style={{fontSize: '0.875rem', color: '#6b7280'}}>
                            Wahrscheinlichkeit: {cause.probability}%
                          </div>
                        </div>
                        <div style={{color: '#16a34a', fontWeight: '600'}}>
                          {cause.cost}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{marginBottom: '1.5rem'}}>
                    <h4 style={styles.sectionTitle}>⏰ Empfohlene Schritte</h4>
                    <ol style={styles.stepList}>
                      {results.nextSteps.map((step, index) => (
                        <li key={index} style={styles.stepItem}>
                          <div style={styles.stepNumber}>{index + 1}</div>
                          <span style={{color: '#374151'}}>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div style={styles.urgencyAlert}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                      <span>⚠️</span>
                      <span style={{fontWeight: '600'}}>Dringlichkeit</span>
                    </div>
                    <p style={{margin: 0}}>{results.urgency}</p>
                  </div>
                </div>
              ) : (
                <div style={styles.placeholderCard}>
                  <div style={{fontSize: '4rem', marginBottom: '1rem'}}>🚗</div>
                  <h3 style={{fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem'}}>
                    Bereit für die Diagnose
                  </h3>
                  <p style={{color: '#6b7280'}}>
                    Geben Sie Ihr KFZ-Problem ein und lassen Sie es von unserer KI analysieren.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Historie-Tab */
          <div style={styles.card}>
            <div style={{...styles.cardTitle, justifyContent: 'space-between'}}>
              <span>📋 Diagnose-Historie</span>
              {searchHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  style={{
                    ...styles.deleteButton,
                    padding: '0.5rem 1rem'
                  }}
                >
                  🗑️ Alle löschen
                </button>
              )}
            </div>

            {searchHistory.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📋</div>
                <h3 style={{marginBottom: '0.5rem'}}>Keine Historie vorhanden</h3>
                <p>Ihre durchgeführten Diagnosen werden hier angezeigt.</p>
              </div>
            ) : (
              <div style={styles.historyContainer}>
                {searchHistory.map((item) => (
                  <div
                    key={item.id}
                    style={styles.historyItem}
                    onClick={() => loadHistoryItem(item)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = styles.historyItemHover.background;
                      e.currentTarget.style.borderColor = styles.historyItemHover.borderColor;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = styles.historyItem.background;
                      e.currentTarget.style.borderColor = styles.historyItem.borderColor;
                    }}
                  >
                    <div style={styles.historyHeader}>
                      <div style={styles.historyMeta}>
                        {formatDate(item.timestamp)} | {item.aiModel === 'claude' ? '🤖 Claude' : '🤖 ChatGPT'}
                        {item.debugInfo?.mode && (
                          <span style={{
                            ...styles.modeIndicator,
                            background: getModeColor(item.debugInfo.mode),
                            color: 'white',
                            fontSize: '0.625rem',
                            padding: '0.125rem 0.5rem'
                          }}>
                            {getModeText(item.debugInfo.mode)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(item.id);
                        }}
                        style={styles.deleteButton}
                      >
                        🗑️
                      </button>
                    </div>
                    <div style={styles.historyProblem}>
                      {item.problem.length > 100 ? `${item.problem.substring(0, 100)}...` : item.problem}
                    </div>
                    <div style={styles.historyDetails}>
                      Fahrzeug: {item.carDetails.make} {item.carDetails.model} ({item.carDetails.year})
                      {item.vin && ` | VIN: ${item.vin.substring(0, 8)}...`}
                      {item.results && ` | Vertrauen: ${item.results.confidence}%`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default KFZDiagnosePlatform;