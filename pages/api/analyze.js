// pages/api/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { problem, carDetails, aiModel } = req.body;

  if (!problem || !carDetails) {
    return res.status(400).json({ message: 'Problem und Fahrzeugdaten sind erforderlich' });
  }

  try {
    let analysis;

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
      // Claude API Integration
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content[0].text;
      
      // Versuche JSON zu extrahieren
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Kein JSON gefunden');
        }
      } catch (parseError) {
        analysis = createFallbackAnalysis(content, 'claude');
      }

    } else if (aiModel === 'chatgpt' && process.env.OPENAI_API_KEY) {
      // OpenAI API Integration
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Versuche JSON zu extrahieren
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Kein JSON gefunden');
        }
      } catch (parseError) {
        analysis = createFallbackAnalysis(content, 'chatgpt');
      }
    } else {
      // Demo-Modus: Intelligente Analyse basierend auf dem Problem
      analysis = createIntelligentDemo(problem, carDetails, aiModel);
    }

    res.status(200).json({ 
      analysis,
      mode: (process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY) ? 'live' : 'demo'
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // Fallback für Demo-Zwecke
    const demoAnalysis = createIntelligentDemo(problem, carDetails, aiModel);
    
    res.status(200).json({ 
      analysis: demoAnalysis,
      mode: 'demo',
      note: 'Demo-Modus: API-Keys nicht verfügbar' 
    });
  }
}

// Intelligente Demo-Analyse basierend auf Schlüsselwörtern
function createIntelligentDemo(problem, carDetails, aiModel) {
  const problemLower = problem.toLowerCase();
  
  // Starter-Probleme
  if (problemLower.includes('springt nicht an') || problemLower.includes('startet nicht') || problemLower.includes('anlasser')) {
    return {
      diagnosis: `Basierend auf Ihrer Beschreibung "${problem}" für Ihr ${carDetails.make} ${carDetails.model} deutet dies auf ein Starterproblem hin. Das typische Klicken beim Startversuch weist auf einen defekten Anlasser oder schwache Batterie hin.`,
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
      diagnosis: `Die Symptome "${problem}" bei Ihrem ${carDetails.make} ${carDetails.model} deuten auf ein Motorproblem hin. Dies könnte verschiedene Ursachen haben, von Zündproblemen bis hin zu Kraftstoffsystemproblemen.`,
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
      diagnosis: `Das beschriebene Problem "${problem}" bei Ihrem ${carDetails.make} ${carDetails.model} deutet auf ein Bremsenproblem hin. Dies erfordert sofortige Aufmerksamkeit aus Sicherheitsgründen.`,
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
    diagnosis: `Basierend auf Ihrer Beschreibung "${problem}" für Ihr ${carDetails.make} ${carDetails.model} (${carDetails.year}, ${carDetails.mileage}km) empfehle ich eine professionelle Diagnose zur genauen Problembestimmung.`,
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