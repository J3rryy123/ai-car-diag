// pages/api/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { problem, carDetails, aiModel } = req.body;

  if (!problem || !carDetails) {
    return res.status(400).json({ message: 'Problem und Fahrzeugdaten sind erforderlich' });
  }

  // Debug-Informationen
  const debugInfo = {
    hasClaudeKey: !!process.env.CLAUDE_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    selectedModel: aiModel,
    environment: process.env.NODE_ENV
  };

  console.log('API Debug Info:', debugInfo);

  try {
    let analysis;
    let apiUsed = 'demo';
    let errorDetails = null;
    let modelUsed = null;

    // Prompt für die KI-Modelle
    const prompt = `Analysiere folgendes KFZ-Problem als Experte:

Fahrzeug: ${carDetails.make} ${carDetails.model} ${carDetails.year}, ${carDetails.mileage}km
Problem: ${problem}

Bitte gib eine strukturierte Antwort in folgendem JSON-Format zurück:
{
  "diagnosis": "Detaillierte Diagnose des Problems",
  "confidence": 85,
  "possibleCauses": [
    {"cause": "Hauptursache", "probability": 80, "cost": "200-400€"},
    {"cause": "Alternative", "probability": 15, "cost": "50-100€"}
  ],
  "nextSteps": [
    "Erster Schritt",
    "Zweiter Schritt",
    "Dritter Schritt"
  ],
  "urgency": "Beschreibung der Dringlichkeit"
}`;

    if (aiModel === 'claude' && process.env.CLAUDE_API_KEY) {
      // Claude Modelle in Prioritätsreihenfolge
      const claudeModels = [
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
              'x-api-key': process.env.CLAUDE_API_KEY,
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
            
            // Versuche JSON zu extrahieren
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
                apiUsed = 'claude';
                modelUsed = model;
                console.log(`Claude API Success with model: ${model}`);
                break; // Erfolgreich, stoppe die Schleife
              } else {
                throw new Error('Kein JSON gefunden in Claude Response');
              }
            } catch (parseError) {
              console.error('JSON Parse Error:', parseError);
              analysis = createFallbackAnalysis(content, 'claude');
              apiUsed = 'claude-fallback';
              modelUsed = model;
              break; // Verwende Fallback, stoppe die Schleife
            }
          } else {
            const errorText = await response.text();
            console.error(`Claude API Error with model ${model}:`, response.status, errorText);
            
            // Wenn es ein 404 Fehler ist, versuche das nächste Modell
            if (response.status === 404) {
              continue;
            } else {
              // Bei anderen Fehlern, stoppe und verwende Demo
              throw new Error(`Claude API Error: ${response.status} - ${errorText}`);
            }
          }
        } catch (modelError) {
          console.error(`Error with Claude model ${model}:`, modelError);
          // Bei Netzwerkfehlern etc., versuche das nächste Modell
          if (model === claudeModels[claudeModels.length - 1]) {
            // Letztes Modell, verwende Demo
            errorDetails = `Alle Claude-Modelle fehlgeschlagen. Letzter Fehler: ${modelError.message}`;
          }
        }
      }

      // Wenn kein Claude-Modell funktioniert hat
      if (!analysis) {
        analysis = createIntelligentDemo(problem, carDetails, aiModel);
        apiUsed = 'demo-claude-error';
        errorDetails = errorDetails || 'Alle Claude-Modelle nicht verfügbar';
      }

    } else if (aiModel === 'chatgpt' && process.env.OPENAI_API_KEY) {
      // OpenAI Modelle in Prioritätsreihenfolge
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

            // Versuche JSON zu extrahieren
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
                apiUsed = 'openai';
                modelUsed = model;
                console.log(`OpenAI API Success with model: ${model}`);
                break; // Erfolgreich, stoppe die Schleife
              } else {
                throw new Error('Kein JSON gefunden in OpenAI Response');
              }
            } catch (parseError) {
              console.error('JSON Parse Error:', parseError);
              analysis = createFallbackAnalysis(content, 'chatgpt');
              apiUsed = 'openai-fallback';
              modelUsed = model;
              break; // Verwende Fallback, stoppe die Schleife
            }
          } else {
            const errorText = await response.text();
            console.error(`OpenAI API Error with model ${model}:`, response.status, errorText);
            
            // Wenn es ein 404 Fehler ist, versuche das nächste Modell
            if (response.status === 404) {
              continue;
            } else {
              // Bei anderen Fehlern, stoppe und verwende Demo
              throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
            }
          }
        } catch (modelError) {
          console.error(`Error with OpenAI model ${model}:`, modelError);
          // Bei Netzwerkfehlern etc., versuche das nächste Modell
          if (model === openaiModels[openaiModels.length - 1]) {
            // Letztes Modell, verwende Demo
            errorDetails = `Alle OpenAI-Modelle fehlgeschlagen. Letzter Fehler: ${modelError.message}`;
          }
        }
      }

      // Wenn kein OpenAI-Modell funktioniert hat
      if (!analysis) {
        analysis = createIntelligentDemo(problem, carDetails, aiModel);
        apiUsed = 'demo-openai-error';
        errorDetails = errorDetails || 'Alle OpenAI-Modelle nicht verfügbar';
      }
    } else {
      // Demo-Modus: Kein API-Key verfügbar
      console.log('Using demo mode - no API key available');
      analysis = createIntelligentDemo(problem, carDetails, aiModel);
      apiUsed = 'demo-no-key';
    }

    res.status(200).json({ 
      analysis,
      mode: apiUsed,
      modelUsed: modelUsed,
      debug: debugInfo,
      error: errorDetails,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('General API Error:', error);
    
    // Fallback für Demo-Zwecke
    const demoAnalysis = createIntelligentDemo(problem, carDetails, aiModel);
    
    res.status(200).json({ 
      analysis: demoAnalysis,
      mode: 'demo-error',
      debug: debugInfo,
      error: error.message,
      note: 'Fallback auf Demo-Modus aufgrund von Fehler'
    });
  }
}

// Intelligente Demo-Analyse basierend auf Schlüsselwörtern
function createIntelligentDemo(problem, carDetails, aiModel) {
  const problemLower = problem.toLowerCase();
  
  // Starter-Probleme
  if (problemLower.includes('springt nicht an') || problemLower.includes('startet nicht') || problemLower.includes('anlasser')) {
    return {
      diagnosis: `[DEMO] Basierend auf Ihrer Beschreibung "${problem}" für Ihr ${carDetails.make} ${carDetails.model} deutet dies auf ein Starterproblem hin. Das typische Klicken beim Startversuch weist auf einen defekten Anlasser oder schwache Batterie hin.`,
      confidence: aiModel === 'claude' ? 92 : 88,
      possibleCauses: [
        { cause: "Defekter Anlasser", probability: 75, cost: "250-450€" },
        { cause: "Schwache/defekte Batterie", probability: 20, cost: "80-150€" },
        { cause: "Korrodierte Batterieklemmen", probability: 5, cost: "10-30€" }
      ],
      nextSteps: [
        "Batteriespannung mit Multimeter prüfen (>12,4V)",
        "Batterieklemmen auf Korrosion überprüfen",
        "Anlasser durch Fachbetrieb testen lassen",
        "Bei Bestätigung entsprechende Reparatur durchführen"
      ],
      urgency: "Hoch - Fahrzeug derzeit nicht fahrbereit"
    };
  }
  
  // Motor-Probleme
  if (problemLower.includes('motor') || problemLower.includes('ruckelt') || problemLower.includes('stottert')) {
    return {
      diagnosis: `[DEMO] Die Symptome "${problem}" bei Ihrem ${carDetails.make} ${carDetails.model} deuten auf ein Motorproblem hin. Dies könnte verschiedene Ursachen haben, von Zündproblemen bis hin zu Kraftstoffsystemproblemen.`,
      confidence: aiModel === 'claude' ? 85 : 82,
      possibleCauses: [
        { cause: "Defekte Zündkerzen", probability: 45, cost: "80-200€" },
        { cause: "Verstopfter Luftfilter", probability: 25, cost: "20-50€" },
        { cause: "Kraftstoffpumpe schwach", probability: 20, cost: "300-600€" },
        { cause: "Lambdasonde defekt", probability: 10, cost: "150-400€" }
      ],
      nextSteps: [
        "Fehlerspeicher mit OBD-Scanner auslesen",
        "Zündkerzen und Luftfilter überprüfen",
        "Kraftstoffdruck messen lassen",
        "Professionelle Motordiagnose durchführen"
      ],
      urgency: "Mittel - Baldige Überprüfung empfohlen"
    };
  }
  
  // Bremsen-Probleme
  if (problemLower.includes('bremse') || problemLower.includes('quietscht') || problemLower.includes('schleift')) {
    return {
      diagnosis: `[DEMO] Das beschriebene Problem "${problem}" bei Ihrem ${carDetails.make} ${carDetails.model} deutet auf ein Bremsenproblem hin. Dies erfordert sofortige Aufmerksamkeit aus Sicherheitsgründen.`,
      confidence: aiModel === 'claude' ? 90 : 87,
      possibleCauses: [
        { cause: "Abgenutzte Bremsbeläge", probability: 60, cost: "150-300€" },
        { cause: "Verschlissene Bremsscheiben", probability: 25, cost: "200-500€" },
        { cause: "Festsitzender Bremssattel", probability: 15, cost: "100-250€" }
      ],
      nextSteps: [
        "SOFORT Bremsen überprüfen lassen",
        "Nicht weiterfahren bei starken Geräuschen",
        "Bremsbeläge und -scheiben inspizieren",
        "Professionelle Reparatur durchführen"
      ],
      urgency: "SEHR HOCH - Sofortige Überprüfung erforderlich!"
    };
  }
  
  // Standard-Fallback
  return {
    diagnosis: `[DEMO] Basierend auf Ihrer Beschreibung "${problem}" für Ihr ${carDetails.make} ${carDetails.model} (${carDetails.year}, ${carDetails.mileage}km) empfehle ich eine professionelle Diagnose zur genauen Problembestimmung.`,
    confidence: aiModel === 'claude' ? 78 : 75,
    possibleCauses: [
      { cause: "Verschleißbedingte Komponente", probability: 50, cost: "100-400€" },
      { cause: "Elektrisches Problem", probability: 30, cost: "80-250€" },
      { cause: "Wartung erforderlich", probability: 20, cost: "50-150€" }
    ],
    nextSteps: [
      "Fahrzeug von qualifizierter Werkstatt prüfen lassen",
      "Fehlerspeicher auslesen",
      "Sichtprüfung der betroffenen Bereiche",
      "Reparatur nach professioneller Diagnose"
    ],
    urgency: "Normal - Überprüfung in den nächsten Tagen"
  };
}

function createFallbackAnalysis(content, aiModel) {
  return {
    diagnosis: content.length > 300 ? content.substring(0, 300) + '...' : content,
    confidence: aiModel === 'claude' ? 85 : 80,
    possibleCauses: [
      { cause: "Häufigste Ursache lt. KI", probability: 70, cost: "150-350€" },
      { cause: "Alternative Ursache", probability: 30, cost: "80-200€" }
    ],
    nextSteps: [
      "Professionelle Diagnose durchführen lassen",
      "Fehlerspeicher auslesen",
      "Reparatur nach Befund durchführen"
    ],
    urgency: "Zeitnahe Überprüfung empfohlen"
  };
}