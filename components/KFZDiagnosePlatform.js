import React, { useState } from 'react';

const KFZDiagnosePlatform = () => {
  const [problem, setProblem] = useState('');
  const [carDetails, setCarDetails] = useState({
    make: '',
    model: '',
    year: '',
    mileage: ''
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedAI, setSelectedAI] = useState('claude');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

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

  // Bestimme die Farbe basierend auf dem Modus
  const getModeColor = (mode) => {
    if (mode && mode.includes('demo')) return '#f59e0b'; // Gelb für Demo
    if (mode === 'claude' || mode === 'openai') return '#16a34a'; // Grün für echte API
    if (mode === 'claude-fallback' || mode === 'openai-fallback') return '#0891b2'; // Blau für Fallback
    return '#6b7280'; // Grau für unbekannt
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
          <div style={styles.headerIcon}>🚗</div>
          <div>
            <h1 style={styles.title}>KFZ-Diagnose Platform</h1>
            <p style={styles.subtitle}>KI-gestützte Fahrzeugdiagnose mit Claude & ChatGPT</p>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.grid}>
          {/* Eingabebereich */}
          <div>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                🔍 Problem beschreiben
              </h2>

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

                {/* Vertrauenswert */}
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

                {/* Diagnose */}
                <div style={{marginBottom: '1.5rem'}}>
                  <h4 style={styles.sectionTitle}>🔍 Diagnose</h4>
                  <p style={{color: '#374151', lineHeight: '1.6'}}>{results.diagnosis}</p>
                </div>

                {/* Mögliche Ursachen */}
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

                {/* Nächste Schritte */}
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

                {/* Dringlichkeit */}
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