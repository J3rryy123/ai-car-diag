// analyze Component
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { type, problem, carDetails, aiModel, vin, vinDecoded, obdCode, obdVin, obdVinDecoded, codeInfo } = req.body;

  // OBD2
  if (type === 'obd2') {
    if (!obdCode || !codeInfo) {
      return res.status(400).json({ message: 'OBD2-Code und Code-Informationen sind erforderlich' });
    }

    // Debug-Informationen for OBD2
    const debugInfo = {
      hasClaudeKey: !!process.env.CLAUDE_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      selectedModel: req.body.aiModel,
      environment: process.env.NODE_ENV,
      hasVIN: !!obdVin,
      obdCode: obdCode
    };

    console.log('OBD2 API Debug Info:', debugInfo);
    console.log('Received aiModel:', req.body.aiModel);
    console.log('Will use Claude?', req.body.aiModel === 'claude' && !!process.env.CLAUDE_API_KEY);
    console.log('Will use OpenAI?', req.body.aiModel === 'chatgpt' && !!process.env.OPENAI_API_KEY);

    try {
      let analysis;
      let apiUsed = 'demo-obd2';
      let errorDetails = null;
      let modelUsed = null;

      // try AI
      const aiModel = req.body.aiModel || 'claude'; // Default Claude für OBD2
      
      if ((aiModel === 'claude' && process.env.CLAUDE_API_KEY) || (aiModel === 'chatgpt' && process.env.OPENAI_API_KEY)) {
        const vehicleInfo = obdVinDecoded ? `${obdVinDecoded.make} ${obdVinDecoded.series} (${obdVinDecoded.year})` : 'Fahrzeug';
        
        const prompt = `Analysiere folgenden OBD2-Fehlercode als KFZ-Experte:

OBD2-Code: ${obdCode}
Beschreibung: ${codeInfo.description}
Kategorie: ${codeInfo.category}
Schweregrad: ${codeInfo.severity}
${obdVinDecoded ? `Fahrzeug: ${vehicleInfo}` : ''}

Bekannte Symptome: ${codeInfo.symptoms.join(', ')}
Häufige Ursachen: ${codeInfo.commonCauses.join(', ')}

Bitte gib eine detaillierte OBD2-Analyse in folgendem JSON-Format zurück:
{
  "diagnosis": "Detaillierte Diagnose mit fahrzeugspezifischen Hinweisen und Reparaturempfehlungen",
  "confidence": 90,
  "category": "${codeInfo.category}",
  "symptoms": ["Spezifische Symptome", "Weitere Anzeichen"],
  "possibleCauses": [
    {"cause": "Wahrscheinlichste Ursache", "probability": 70, "cost": "200-400€", "commonFor": "Spezifischer Kontext"},
    {"cause": "Alternative Ursache", "probability": 20, "cost": "100-200€", "commonFor": "Häufig bei diesem Fahrzeugtyp"}
  ],
  "nextSteps": [
    "Spezifischer Diagnoseschritt mit Werkzeugen",
    "Prüfung spezifischer Komponenten",
    "Reparaturschritte in korrekter Reihenfolge"
  ],
  "urgency": "Dringlichkeitsbewertung basierend auf Schweregrad und Auswirkungen",
  "vehicleSpecific": "Spezifische Hinweise für dieses Fahrzeugmodell oder allgemeine Tipps",
  "preventiveMeasures": "Vorbeugende Maßnahmen um diesen Fehler zu vermeiden"
}`;

        // Claude API 
        if (aiModel === 'claude' && process.env.CLAUDE_API_KEY) {
          const claudeModels = [
            'claude-3-5-sonnet-20241022',
            'claude-3-5-sonnet-20240620',
            'claude-3-sonnet-20240229'
          ];

          for (const model of claudeModels) {
            try {
              console.log(`Attempting Claude API for OBD2 with model: ${model}`);
              
              const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-API-Key': process.env.CLAUDE_API_KEY,
                  'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                  model: model,
                  max_tokens: 2000,
                  messages: [{
                    role: 'user',
                    content: prompt
                  }]
                })
              });

              console.log(`Claude OBD2 API Response Status: ${response.status} for model: ${model}`);

              if (response.ok) {
                const data = await response.json();
                const content = data.content[0].text;

                try {
                  const jsonMatch = content.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    analysis = JSON.parse(jsonMatch[0]);
                    apiUsed = 'claude-obd2';
                    modelUsed = model;
                    console.log(`Claude OBD2 API Success with model: ${model}`);
                    break;
                  } else {
                    throw new Error('Kein JSON gefunden in Claude OBD2 Response');
                  }
                } catch (parseError) {
                  console.error('Claude OBD2 JSON Parse Error:', parseError);
                  // fallback
                  analysis = createIntelligentOBD2Analysis(obdCode, codeInfo, obdVinDecoded, content);
                  apiUsed = 'claude-obd2-fallback';
                  modelUsed = model;
                  break;
                }
              } else {
                const errorData = await response.json().catch(() => null);
                const modelError = new Error(`Claude OBD2 API ${response.status}: ${errorData?.error?.message || 'Unknown error'}`);
                console.error(`Claude OBD2 API Error for model ${model}:`, modelError);
                
                if (response.status === 400 || response.status === 401) {
                  errorDetails = `Claude OBD2 API Fehler: ${modelError.message}`;
                  break;
                }
              }
            } catch (error) {
              console.error(`Claude OBD2 Network Error for model ${model}:`, error);
              if (model === claudeModels[claudeModels.length - 1]) {
                errorDetails = `Claude OBD2 Netzwerk-Fehler: ${error.message}`;
              }
            }
          }
        }

        // OpenAI API
        if (!analysis && aiModel === 'chatgpt' && process.env.OPENAI_API_KEY) {
          const openaiModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'];

          for (const model of openaiModels) {
            try {
              console.log(`Attempting OpenAI API for OBD2 with model: ${model}`);
              
              const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                  model: model,
                  messages: [{
                    role: 'user',
                    content: prompt
                  }],
                  max_tokens: 2000,
                  temperature: 0.7
                })
              });

              console.log(`OpenAI OBD2 API Response Status: ${response.status} for model: ${model}`);

              if (response.ok) {
                const data = await response.json();
                const content = data.choices[0].message.content;

                try {
                  const jsonMatch = content.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    analysis = JSON.parse(jsonMatch[0]);
                    apiUsed = 'openai-obd2';
                    modelUsed = model;
                    console.log(`OpenAI OBD2 API Success with model: ${model}`);
                    break;
                  } else {
                    throw new Error('Kein JSON gefunden in OpenAI OBD2 Response');
                  }
                } catch (parseError) {
                  console.error('OpenAI OBD2 JSON Parse Error:', parseError);
                  analysis = createIntelligentOBD2Analysis(obdCode, codeInfo, obdVinDecoded, content);
                  apiUsed = 'openai-obd2-fallback';
                  modelUsed = model;
                  break;
                }
              } else {
                const errorData = await response.json().catch(() => null);
                const modelError = new Error(`OpenAI OBD2 API ${response.status}: ${errorData?.error?.message || 'Unknown error'}`);
                console.error(`OpenAI OBD2 API Error for model ${model}:`, modelError);
                
                if (response.status === 400 || response.status === 401) {
                  errorDetails = `OpenAI OBD2 API Fehler: ${modelError.message}`;
                  break;
                }
              }
            } catch (error) {
              console.error(`OpenAI OBD2 Network Error for model ${model}:`, error);
              if (model === openaiModels[openaiModels.length - 1]) {
                errorDetails = `OpenAI OBD2 Netzwerk-Fehler: ${error.message}`;
              }
            }
          }
        }
      }

      // Fallback 
      if (!analysis) {
        console.log('No AI analysis succeeded, falling back to demo mode');
        console.log('Error details:', errorDetails);
        analysis = createOBD2Analysis(obdCode, codeInfo, obdVinDecoded);
        apiUsed = 'demo-obd2';
        errorDetails = errorDetails || `Keine ${aiModel === 'claude' ? 'Claude' : 'OpenAI'} API verfügbar - Demo-Modus`;
        modelUsed = 'Demo';
      } else {
        console.log('AI analysis successful, mode:', apiUsed);
      }

      return res.status(200).json({
        analysis,
        mode: apiUsed,
        debug: debugInfo,
        error: errorDetails,
        timestamp: new Date().toISOString(),
        modelUsed: modelUsed
      });

    } catch (error) {
      console.error('OBD2 Analysis error:', error);
      
      // Fallback
      const fallbackAnalysis = createOBD2Analysis(obdCode, codeInfo, obdVinDecoded);
      
      return res.status(200).json({ 
        analysis: fallbackAnalysis,
        mode: 'demo-obd2-error',
        debug: debugInfo,
        error: `OBD2 Fehler: ${error.message}`,
        timestamp: new Date().toISOString(),
        modelUsed: 'Fallback'
      });
    }
  }

  //Diagnose
  if (!problem || !carDetails) {
    return res.status(400).json({ message: 'Problem und Fahrzeugdaten sind erforderlich' });
  }

  // Debug-Informationen
  const debugInfo = {
    hasClaudeKey: !!process.env.CLAUDE_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    selectedModel: aiModel,
    environment: process.env.NODE_ENV,
    hasVIN: !!vin
  };

  console.log('API Debug Info:', debugInfo);

  try {
    let analysis;
    let apiUsed = 'demo';
    let errorDetails = null;
    let modelUsed = null;

    // Erweiterten Prompt with VIN
    let vehicleInfo = `${carDetails.make} ${carDetails.model} ${carDetails.year}`;
    if (carDetails.engineType) {
      vehicleInfo += `, Motor: ${carDetails.engineType}`;
    }

    const prompt = `Analysiere folgendes KFZ-Problem als Experte:

Fahrzeug: ${vehicleInfo}
Problem: ${problem}

${vin ? `Die VIN wurde bereitgestellt, was zusätzliche Fahrzeugspezifika ermöglicht. Bitte berücksichtige bekannte Probleme und Rückrufe für dieses spezifische Fahrzeug falls relevant.` : ''}

Bitte gib eine strukturierte Antwort in folgendem JSON-Format zurück:
{
  "diagnosis": "Detaillierte Diagnose des Problems mit fahrzeugspezifischen Hinweisen",
  "confidence": 85,
  "possibleCauses": [
    {"cause": "Hauptursache", "probability": 80, "cost": "200-400€", "commonFor": "Häufig bei diesem Modell/Baujahr"},
    {"cause": "Alternative", "probability": 15, "cost": "50-100€", "commonFor": "Allgemein"}
  ],
  "nextSteps": [
    "Erster Schritt",
    "Zweiter Schritt", 
    "Dritter Schritt"
  ],
  "urgency": "Beschreibung der Dringlichkeit",
  "vehicleSpecific": "Spezifische Hinweise für dieses Fahrzeugmodell (falls verfügbar)"
}`;

    if (aiModel === 'claude' && process.env.CLAUDE_API_KEY) {
      // Claude Models
      const claudeModels = [
        'claude-sonnet-5-20250514',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ];

      for (const model of claudeModels) {
        try {
          console.log(`Attempting Claude API call with model: ${model}`);
          
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': process.env.CLAUDE_API_KEY,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: model,
              max_tokens: 2000,
              messages: [{
                role: 'user',
                content: prompt
              }]
            })
          });

          console.log(`Claude API Response Status: ${response.status} for model: ${model}`);

          if (response.ok) {
            const data = await response.json();
            const content = data.content[0].text;

            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
                apiUsed = 'claude';
                modelUsed = model;
                console.log(`Claude API Success with model: ${model}`);
                break; 
              } else {
                throw new Error('Kein JSON gefunden in Claude Response');
              }
            } catch (parseError) {
              console.error('JSON Parse Error:', parseError);
              analysis = createFallbackAnalysis(content, aiModel);
              apiUsed = 'claude-fallback';
              modelUsed = model;
              break;
            }
          } else {
            const errorData = await response.json().catch(() => null);
            const modelError = new Error(`Claude API ${response.status}: ${errorData?.error?.message || 'Unknown error'}`);
            console.error(`Claude API Error for model ${model}:`, modelError);
            
            if (response.status === 400 || response.status === 401) {
              errorDetails = `Claude API Fehler: ${modelError.message}`;
              break;
            }
            
            if (model === claudeModels[claudeModels.length - 1]) {
              errorDetails = `Alle Claude-Modelle fehlgeschlagen. Letzter Fehler: ${modelError.message}`;
            }
          }
        } catch (networkError) {
          console.error(`Network error for Claude model ${model}:`, networkError);
          if (model === claudeModels[claudeModels.length - 1]) {
            errorDetails = `Claude Netzwerk-Fehler. Letzter Fehler: ${networkError.message}`;
          }
        }
      }

      if (!analysis) {
        analysis = createIntelligentDemo(problem, carDetails, aiModel, vin);
        apiUsed = 'demo-claude-error';
        errorDetails = errorDetails || 'Alle Claude-Modelle nicht verfügbar';
      }

    } else if (aiModel === 'chatgpt' && process.env.OPENAI_API_KEY) {
      // OpenAI Models
      const openaiModels = [
        'gpt-4o-mini',
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo'
      ];

      for (const model of openaiModels) {
        try {
          console.log(`Attempting OpenAI API call with model: ${model}`);
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: model,
              messages: [{
                role: 'user',
                content: prompt
              }],
              max_tokens: 2000,
              temperature: 0.7
            })
          });

          console.log(`OpenAI API Response Status: ${response.status} for model: ${model}`);

          if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content;

            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
                apiUsed = 'openai';
                modelUsed = model;
                console.log(`OpenAI API Success with model: ${model}`);
                break; 
              } else {
                throw new Error('Kein JSON gefunden in OpenAI Response');
              }
            } catch (parseError) {
              console.error('JSON Parse Error:', parseError);
              analysis = createFallbackAnalysis(content, aiModel);
              apiUsed = 'openai-fallback';
              modelUsed = model;
              break;
            }
          } else {
            const errorData = await response.json().catch(() => null);
            const modelError = new Error(`OpenAI API ${response.status}: ${errorData?.error?.message || 'Unknown error'}`);
            console.error(`OpenAI API Error for model ${model}:`, modelError);
            
            if (response.status === 400 || response.status === 401) {
              errorDetails = `OpenAI API Fehler: ${modelError.message}`;
              break;
            }
            
            if (model === openaiModels[openaiModels.length - 1]) {
              errorDetails = `Alle OpenAI-Modelle fehlgeschlagen. Letzter Fehler: ${modelError.message}`;
            }
          }
        } catch (networkError) {
          console.error(`Network error for OpenAI model ${model}:`, networkError);
          if (model === openaiModels[openaiModels.length - 1]) {
            errorDetails = `OpenAI Netzwerk-Fehler. Letzter Fehler: ${networkError.message}`;
          }
        }
      }

      if (!analysis) {
        analysis = createIntelligentDemo(problem, carDetails, aiModel, vin);
        apiUsed = 'demo-openai-error';
        errorDetails = errorDetails || 'Alle OpenAI-Modelle nicht verfügbar';
      }

    } else {
      analysis = createIntelligentDemo(problem, carDetails, aiModel, vin);
      apiUsed = `demo-${aiModel}`;
      errorDetails = aiModel === 'claude' ? 'Claude API-Key nicht verfügbar' : 'OpenAI API-Key nicht verfügbar';
    }

    return res.status(200).json({
      analysis,
      mode: apiUsed,
      debug: debugInfo,
      error: errorDetails,
      timestamp: new Date().toISOString(),
      modelUsed: modelUsed
    });

  } catch (error) {
    console.error('General analysis error:', error);
    
    // Fallback
    const fallbackAnalysis = createIntelligentDemo(problem, carDetails, aiModel, vin);
    
    return res.status(200).json({
      analysis: fallbackAnalysis,
      mode: 'demo-error',
      debug: debugInfo,
      error: `Unerwarteter Fehler: ${error.message}`,
      timestamp: new Date().toISOString(),
      modelUsed: 'fallback'
    });
  }
}

function createIntelligentOBD2Analysis(obdCode, codeInfo, vinDecoded, aiContent) {
  const vehicleInfo = vinDecoded ? ` für ${vinDecoded.make} ${vinDecoded.series} (${vinDecoded.year})` : '';
  
  return {
    codeInfo,
    diagnosis: aiContent.length > 500 ? aiContent.substring(0, 500) + '...' : aiContent,
    confidence: 88,
    category: codeInfo.category,
    symptoms: codeInfo.symptoms,
    possibleCauses: codeInfo.commonCauses.map((cause, index) => ({
      cause,
      probability: Math.max(75 - index * 12, 10),
      commonFor: `KI-Analyse: ${codeInfo.category}`
    })),
    nextSteps: [
      `${codeInfo.category} mit professionellem OBD2-Scanner überprüfen`,
      'Live-Daten und Freeze-Frame-Daten auslesen',
      'Komponenten entsprechend KI-Empfehlung testen',
      'Reparatur nach detaillierter Diagnose durchführen',
      'Testfahrt und Fehlerspeicher erneut prüfen'
    ],
    urgency: codeInfo.severity === 'Hoch' ? 'HOCH - Sofortige professionelle Diagnose empfohlen' : 
             codeInfo.severity === 'Mittel' ? 'MITTEL - Zeitnahe Überprüfung ratsam' : 
             'NIEDRIG - Bei nächster Werkstattbesuch erwähnen',
    vehicleSpecific: vinDecoded ? `Spezifische Hinweise für ${vinDecoded.make} ${vinDecoded.series}` : 'Allgemeine OBD2-Diagnose',
    preventiveMeasures: 'Regelmäßige Wartung und Qualitätskraftstoff verwenden'
  };
}
function createOBD2Analysis(obdCode, codeInfo, vinDecoded = null) {
  const vehicleInfo = vinDecoded ? ` für ${vinDecoded.make} ${vinDecoded.series} (${vinDecoded.year})` : '';
  
  return {
    codeInfo,
    diagnosis: `[DEMO] OBD2-Code ${obdCode}${vehicleInfo}: ${codeInfo.description}. Schweregrad: ${codeInfo.severity}`,
    confidence: 90,
    category: codeInfo.category,
    symptoms: codeInfo.symptoms,
    possibleCauses: codeInfo.commonCauses.map((cause, index) => ({
      cause,
      probability: Math.max(80 - index * 15, 10),
      commonFor: `Häufig bei ${codeInfo.category}`
    })),
    nextSteps: [
      `${codeInfo.category} detailliert überprüfen`,
      'Zusätzliche Fehlercodes auslesen',
      'Live-Daten mit OBD2-Scanner prüfen',
      'Reparatur entsprechend Diagnose durchführen',
      'Fehlerspeicher nach Reparatur löschen'
    ],
    urgency: codeInfo.severity === 'Hoch' ? 'HOCH - Zeitnahe Reparatur erforderlich' : 
             codeInfo.severity === 'Mittel' ? 'MITTEL - Baldige Überprüfung empfohlen' : 
             'NIEDRIG - Bei nächster Inspektion prüfen lassen'
  };
}

function createIntelligentDemo(problem, carDetails, aiModel, vin) {
  const problemLower = problem.toLowerCase();
  const vinInfo = vin ? ` (VIN: ${vin})` : '';
  

  const getVehicleSpecificHint = () => {
    if (!vin) return null;
    
   
    const wmi = vin.substring(0, 3).toUpperCase();
    const vinHints = {
      'WBA': 'BMW-Fahrzeuge dieser Serie sind bekannt für Probleme mit der Wasserpumpe ab 80.000km',
      'WDB': 'Mercedes-Benz Modelle haben häufig Luftfederungs-Probleme nach 100.000km',
      'WAU': 'Audi-Fahrzeuge zeigen oft Probleme mit dem Direkteinspritzersystem',
      'WVW': 'Volkswagen-Modelle haben bekannte DSG-Getriebe Probleme bei höherer Laufleistung'
    };
    
    return vinHints[wmi] || 'Spezifische Herstellerinformationen für detailliertere Diagnose verfügbar';
  };

  // Starter-Problems
  if (problemLower.includes('springt nicht an') || problemLower.includes('startet nicht') || problemLower.includes('anlasser')) {
    return {
      diagnosis: `[DEMO] Basierend auf Ihrer Beschreibung "${problem}" für Ihr ${carDetails.make} ${carDetails.model}${vinInfo} deutet dies auf ein Starterproblem hin. Das typische Klicken beim Startversuch weist auf einen defekten Anlasser oder schwache Batterie hin.`,
      confidence: aiModel === 'claude' ? 92 : 88,
      possibleCauses: [
        { cause: "Defekter Anlasser", probability: 75, commonFor: "Häufig bei diesem Alter" },
        { cause: "Schwache/defekte Batterie", probability: 20, commonFor: "Allgemein" },
        { cause: "Korrodierte Batterieklemmen", probability: 5, commonFor: "Ältere Fahrzeuge" }
      ],
      nextSteps: [
        "Batteriespannung mit Multimeter prüfen (>12,4V)",
        "Batterieklemmen auf Korrosion überprüfen",
        "Anlasser durch Fachbetrieb testen lassen",
        "Bei Bestätigung entsprechende Reparatur durchführen"
      ],
      urgency: "Hoch - Fahrzeug derzeit nicht fahrbereit",
      vehicleSpecific: getVehicleSpecificHint()
    };
  }
  
  // Engine-Problems
  if (problemLower.includes('motor') || problemLower.includes('ruckelt') || problemLower.includes('stottert')) {
    return {
      diagnosis: `[DEMO] Die Symptome "${problem}" bei Ihrem ${carDetails.make} ${carDetails.model}${vinInfo} deuten auf ein Motorproblem hin. Dies könnte verschiedene Ursachen haben, von Zündproblemen bis hin zu Kraftstoffsystemproblemen.`,
      confidence: aiModel === 'claude' ? 85 : 82,
      possibleCauses: [
        { cause: "Defekte Zündkerzen", probability: 45, commonFor: "Nach 60.000km normal" },
        { cause: "Verstopfter Luftfilter", probability: 25, commonFor: "Wartungsintervall" },
        { cause: "Kraftstoffpumpe schwach", probability: 20, commonFor: "Hochlaufleistung" },
        { cause: "Lambdasonde defekt", probability: 10, commonFor: "Nach 100.000km" }
      ],
      nextSteps: [
        "Fehlerspeicher mit OBD-Scanner auslesen",
        "Zündkerzen und Luftfilter überprüfen",
        "Kraftstoffdruck messen lassen",
        "Professionelle Motordiagnose durchführen"
      ],
      urgency: "Mittel - Baldige Überprüfung empfohlen",
      vehicleSpecific: getVehicleSpecificHint()
    };
  }
  
  // Break-Problems
  if (problemLower.includes('bremse') || problemLower.includes('quietscht') || problemLower.includes('schleift')) {
    return {
      diagnosis: `[DEMO] Das beschriebene Problem "${problem}" bei Ihrem ${carDetails.make} ${carDetails.model}${vinInfo} deutet auf ein Bremsenproblem hin. Dies erfordert sofortige Aufmerksamkeit aus Sicherheitsgründen.`,
      confidence: aiModel === 'claude' ? 90 : 87,
      possibleCauses: [
        { cause: "Abgenutzte Bremsbeläge", probability: 60, commonFor: "Normal alle 30-50.000km" },
        { cause: "Verschlissene Bremsscheiben", probability: 25, commonFor: "Nach Belagwechsel" },
        { cause: "Festsitzender Bremssattel", probability: 15, commonFor: "Ältere Fahrzeuge" }
      ],
      nextSteps: [
        "SOFORT Bremsen überprüfen lassen",
        "Nicht weiterfahren bei starken Geräuschen",
        "Bremsbeläge und -scheiben inspizieren",
        "Professionelle Reparatur durchführen"
      ],
      urgency: "SEHR HOCH - Sofortige Überprüfung erforderlich!",
      vehicleSpecific: getVehicleSpecificHint()
    };
  }
  
  // Standard-Fallback
  return {
    diagnosis: `[DEMO] Basierend auf Ihrer Beschreibung "${problem}" für Ihr ${carDetails.make} ${carDetails.model}${vinInfo} empfehle ich eine professionelle Diagnose zur genauen Problembestimmung.`,
    confidence: aiModel === 'claude' ? 78 : 75,
    possibleCauses: [
      { cause: "Verschleißbedingte Komponente", probability: 50, commonFor: "Altersbedingt" },
      { cause: "Elektrisches Problem", probability: 30, commonFor: "Moderne Fahrzeuge" },
      { cause: "Wartung erforderlich", probability: 20, commonFor: "Serviceintervall" }
    ],
    nextSteps: [
      "Fahrzeug von qualifizierter Werkstatt prüfen lassen",
      "Fehlerspeicher auslesen",
      "Sichtprüfung der betroffenen Bereiche",
      "Reparatur nach professioneller Diagnose"
    ],
    urgency: "Normal - Überprüfung in den nächsten Tagen",
    vehicleSpecific: getVehicleSpecificHint()
  };
}

function createFallbackAnalysis(content, aiModel) {
  return {
    diagnosis: content.length > 300 ? content.substring(0, 300) + '...' : content,
    confidence: aiModel === 'claude' ? 85 : 80,
    possibleCauses: [
      { cause: "Häufigste Ursache lt. KI", probability: 70, commonFor: "KI-Analyse" },
      { cause: "Alternative Ursache", probability: 30, commonFor: "Sekundär" }
    ],
    nextSteps: [
      "Professionelle Diagnose durchführen lassen",
      "Fehlerspeicher auslesen",
      "Reparatur nach Befund durchführen"
    ],
    urgency: "Zeitnahe Überprüfung empfohlen",
    vehicleSpecific: "Weitere spezifische Analyse durch Fachpersonal empfohlen"
  };
}