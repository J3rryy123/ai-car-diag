import { requireAuth } from '../../utils/server/auth';
import { callClaude } from '../../utils/server/claude';
import { clientIp, createRateLimiter } from '../../utils/server/rateLimit';

// Claude kann länger brauchen als das Standard-Zeitlimit von Vercel
export const config = { maxDuration: 60 };

const MAX_PROBLEM_LENGTH = 2000;
const MAX_FIELD_LENGTH = 100;
const OBD_CODE_PATTERN = /^[PBCU][0-9A-F]{4}$/;
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

const LANGUAGE_NOTE = 'Antworte vollständig auf Deutsch und übergib das Ergebnis über das bereitgestellte Tool.';

const isRateLimited = createRateLimiter('analyze', 60 * 1000, 20);

const clean = (value, max = MAX_FIELD_LENGTH) =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max) : '';


// --- Strukturierte Antworten (Tool-Aufruf statt Freitext-JSON) ---------------

const CAUSES_SCHEMA = (extra = {}) => ({
  type: 'array',
  items: {
    type: 'object',
    properties: {
      cause: { type: 'string' },
      probability: { type: 'number', description: 'Wahrscheinlichkeit in Prozent (0-100)' },
      cost: { type: 'string', description: 'Geschätzte Kosten, z. B. 200-400€' },
      ...extra,
    },
    required: ['cause', 'probability', 'cost'],
  },
});

const DIAGNOSE_TOOL = {
  name: 'report_diagnosis',
  description: 'Gibt die strukturierte Fahrzeugdiagnose zurück.',
  input_schema: {
    type: 'object',
    properties: {
      diagnosis: { type: 'string', description: 'Ausführliche technische Diagnose' },
      confidence: { type: 'number', description: 'Sicherheit der Diagnose in Prozent (0-100)' },
      possibleCauses: CAUSES_SCHEMA({ commonFor: { type: 'string' } }),
      nextSteps: { type: 'array', items: { type: 'string' } },
      urgency: { type: 'string' },
      vehicleSpecific: { type: 'string' },
      maintenanceRecommendations: { type: 'string' },
    },
    required: ['diagnosis', 'confidence', 'possibleCauses', 'nextSteps', 'urgency'],
  },
};

const OBD_TOOL = {
  name: 'report_obd_diagnosis',
  description: 'Gibt die strukturierte Auswertung eines OBD2-Fehlercodes zurück.',
  input_schema: {
    type: 'object',
    properties: {
      diagnosis: { type: 'string', description: 'Technische Analyse des Codes' },
      category: { type: 'string' },
      severity: { type: 'string' },
      confidence: { type: 'number', description: 'Sicherheit in Prozent (0-100)' },
      symptoms: { type: 'array', items: { type: 'string' } },
      possibleCauses: CAUSES_SCHEMA({ urgency: { type: 'string' } }),
      nextSteps: { type: 'array', items: { type: 'string' } },
      urgency: { type: 'string' },
      estimatedCost: { type: 'string' },
    },
    required: ['diagnosis', 'confidence', 'possibleCauses', 'nextSteps', 'urgency'],
  },
};

// --- AI provider calls -----------------------------------------------------

/**
 * Runs the prompt against the Claude API.
 * Returns { analysis, mode, modelUsed, error } or null when no API key is configured.
 */
async function runAI({ prompt, tool, suffix, fallback }) {
  if (!process.env.CLAUDE_API_KEY) return null;

  try {
    const { toolInput, content, model } = await callClaude(prompt, tool);
    if (toolInput) {
      return { analysis: toolInput, mode: `claude${suffix}`, modelUsed: model, error: null };
    }
    // Ohne Tool-Aufruf: JSON im Text suchen, sonst Freitext-Fallback
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return { analysis: JSON.parse(jsonMatch[0]), mode: `claude${suffix}`, modelUsed: model, error: null };
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }
    }
    return { analysis: fallback(content), mode: `claude${suffix}-fallback`, modelUsed: model, error: null };
  } catch (error) {
    return { analysis: null, mode: null, modelUsed: null, error: error.message };
  }
}

// --- Prompts ---------------------------------------------------------------

// Modell-/Motordaten nur ausgeben, wenn sie aus der Fahrzeugdatenbank bekannt sind
function describeEngine(decoded) {
  const e = decoded?.engine;
  const lines = [];
  if (decoded?.model?.series) lines.push(`- Model: ${clean(decoded.model.series)}`);
  if (e) {
    const parts = [e.displacement, e.fuelType, e.power, e.cylinders ? `${e.cylinders} cylinders` : null, e.turbo ? 'turbo' : null, e.name]
      .filter(Boolean)
      .map((v) => clean(String(v)));
    if (parts.length) lines.push(`- Engine: ${parts.join(', ')}`);
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
}

// Technische Daten aus dem Fahrzeugschein (vom Client gesendet): nur geprüfte Zahlen/Kurztexte übernehmen
function cleanRegistration(raw, vin) {
  if (!raw || typeof raw !== 'object') return null;
  // Gehört der Scan zu einer anderen FIN als die aktuelle Anfrage, nicht verwenden
  const regVin = clean(raw.vin, 17).toUpperCase();
  if (regVin && vin && regVin !== vin) return null;

  const num = (value, min, max) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
  };
  const code = (value, pattern) => {
    const v = clean(value, 6).toUpperCase();
    return pattern.test(v) ? v : null;
  };
  const reg = {
    displacementCcm: num(raw.displacementCcm, 50, 12000),
    powerKw: num(raw.powerKw, 1, 1500),
    hsn: code(raw.hsn, /^[0-9A-Z]{4}$/),
    tsn: code(raw.tsn, /^[0-9A-Z]{3}$/),
    fuel: clean(raw.fuelRaw, 40) || null,
    type: clean(raw.type, 40) || null,
    make: clean(raw.make, 40) || null,
    model: clean(raw.model, 60) || null,
    firstRegistration: /^\d{4}-\d{2}-\d{2}$/.test(raw.firstRegistration || '') ? raw.firstRegistration : null,
  };
  if (reg.powerKw) reg.powerPs = Math.round(reg.powerKw * 1.35962);
  return Object.values(reg).some((v) => v !== null) ? reg : null;
}

// Zeilen für den Prompt; leer, wenn nichts bekannt ist
function describeRegistration(reg) {
  if (!reg) return '';
  const lines = [];
  if (reg.make || reg.model) lines.push(`- Vehicle: ${[reg.make, reg.model].filter(Boolean).join(' ')}`);
  if (reg.displacementCcm) lines.push(`- Displacement: ${reg.displacementCcm} cm³`);
  if (reg.powerKw) lines.push(`- Power: ${reg.powerKw} kW (${reg.powerPs} PS)`);
  if (reg.fuel) lines.push(`- Fuel (registration): ${reg.fuel}`);
  if (reg.hsn && reg.tsn) lines.push(`- German HSN/TSN: ${reg.hsn}/${reg.tsn}`);
  if (reg.type) lines.push(`- Type/Variant (D.2): ${reg.type}`);
  if (reg.firstRegistration) lines.push(`- First registration: ${reg.firstRegistration}`);
  return lines.length ? `Registration document data (read from the vehicle registration, reliable):\n${lines.join('\n')}\n` : '';
}

function buildObdPrompt(obdCode, codeInfo, obdVin, obdVinDecoded, registration) {
  let vehicleContext = '';
  if (obdVinDecoded && obdVinDecoded.isValid) {
    vehicleContext = `
VIN: ${obdVin}
VIN Analysis:
- Manufacturer: ${clean(obdVinDecoded.manufacturer?.name) || 'Unknown'} (${clean(obdVinDecoded.manufacturer?.country) || 'Unknown'})
${obdVinDecoded.year?.modelYear ? `- Model Year: ${clean(String(obdVinDecoded.year.modelYear))}${obdVinDecoded.year.confidence === 'estimated' ? ' (estimated from VIN)' : ''}\n` : ''}${describeEngine(obdVinDecoded)}`;
  }
  vehicleContext += describeRegistration(registration);

  return `Analyze the following OBD2 diagnostic trouble code as an expert automotive technician:

OBD2 Code: ${obdCode}
Code Description: ${clean(codeInfo.description, 300) || 'Unknown'}
Code Category: ${clean(codeInfo.category) || 'General'}
Code Severity: ${clean(codeInfo.severity) || 'Medium'}

${vehicleContext}

Please provide a structured response in the following JSON format:
{
  "diagnosis": "Detailed technical analysis of the code with vehicle-specific considerations",
  "category": "${clean(codeInfo.category) || 'General'}",
  "severity": "${clean(codeInfo.severity) || 'Medium'}",
  "confidence": 90,
  "symptoms": [
    "Primary symptom",
    "Secondary symptom",
    "Additional symptoms"
  ],
  "possibleCauses": [
    {"cause": "Most likely cause", "probability": 60, "cost": "200-400€", "urgency": "Medium"},
    {"cause": "Alternative cause", "probability": 30, "cost": "100-300€", "urgency": "Medium"},
    {"cause": "Less likely cause", "probability": 10, "cost": "50-200€", "urgency": "Low"}
  ],
  "nextSteps": [
    "First diagnostic step",
    "Second step",
    "Third step",
    "Final verification step"
  ],
  "urgency": "Urgency level and timeline",
  "estimatedCost": "Total estimated repair cost range"
}

${LANGUAGE_NOTE}`;
}

function buildDiagnosePrompt(problem, carDetails, vin, vinDecoded, registration) {
  let vehicleInfo = `${carDetails.make} ${carDetails.model} ${carDetails.year}`;
  if (carDetails.engineType) {
    vehicleInfo += `, Engine: ${carDetails.engineType}`;
  }

  let vinContext = '';
  if (vin && vinDecoded && vinDecoded.isValid) {
    vinContext = `
VIN: ${vin}
VIN Analysis:
- Manufacturer: ${clean(vinDecoded.manufacturer?.name) || 'Unknown'} (${clean(vinDecoded.manufacturer?.country) || 'Unknown'})
${vinDecoded.year?.modelYear ? `- Model Year: ${clean(String(vinDecoded.year.modelYear))}${vinDecoded.year.confidence === 'estimated' ? ' (estimated from VIN)' : ''}\n` : ''}${describeEngine(vinDecoded)}`;
  }
  vinContext += describeRegistration(registration);

  return `Analyze the following automotive problem as an expert mechanic:

Vehicle: ${vehicleInfo}
Problem: ${problem}

${vinContext}

Please provide a structured response in the following JSON format:
{
  "diagnosis": "Detailed diagnosis with vehicle-specific considerations",
  "confidence": 85,
  "possibleCauses": [
    {"cause": "Primary cause", "probability": 80, "cost": "200-400€", "commonFor": "Common for this model/year"},
    {"cause": "Alternative", "probability": 15, "cost": "50-100€", "commonFor": "General"}
  ],
  "nextSteps": [
    "First diagnostic step",
    "Second step",
    "Third step"
  ],
  "urgency": "Urgency description",
  "vehicleSpecific": "Specific notes for this vehicle model and VIN",
  "recalls": "Any relevant recalls or TSBs for this VIN",
  "maintenanceRecommendations": "Preventive maintenance specific to this vehicle"
}

${LANGUAGE_NOTE}`;
}

// --- Fallbacks when the model answers without valid JSON -------------------

function createFallbackAnalysis(content) {
  return {
    diagnosis: content.trim() || 'Die KI hat keine auswertbare Antwort geliefert.',
    confidence: 50,
    possibleCauses: [],
    nextSteps: ['Antwort der KI prüfen und Fehlerbild manuell weiter eingrenzen'],
    urgency: 'Mittel – Antwort der KI war nicht strukturiert',
    vehicleSpecific: `Freitext-Antwort (Claude); Format konnte nicht automatisch ausgewertet werden.`,
  };
}

function createOBD2FallbackAnalysis(content, obdCode, codeInfo) {
  return {
    diagnosis: content.trim() || 'Die KI hat keine auswertbare Antwort geliefert.',
    category: codeInfo.category || 'General',
    severity: codeInfo.severity || 'Medium',
    confidence: 50,
    symptoms: [],
    possibleCauses: [],
    nextSteps: [`Fehlercode ${obdCode} manuell weiter prüfen`],
    urgency: 'Mittel – Antwort der KI war nicht strukturiert',
    estimatedCost: 'Unbekannt',
  };
}

// --- Request handling ------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const session = await requireAuth(req, res);
  if (!session) return;
  // Technische Details (Modell, Umgebung) nur für Administratoren bzw. ohne Anmeldeschutz (lokal)
  const debugAllowed = session.user?.role === 'admin' || session.mode === 'open';

  if (await isRateLimited(session.user?.id || clientIp(req))) {
    return res.status(429).json({ message: 'Zu viele Anfragen. Bitte kurz warten.' });
  }

  const body = req.body || {};
  const requestType = body.type === 'obd2' ? 'obd2' : 'diagnose';
  const debug = { requestType, environment: process.env.NODE_ENV };

  if (requestType === 'obd2') {
    const obdCode = clean(body.obdCode, 5).toUpperCase();
    const codeInfo = body.codeInfo && typeof body.codeInfo === 'object' ? body.codeInfo : null;
    if (!OBD_CODE_PATTERN.test(obdCode) || !codeInfo) {
      return res.status(400).json({ message: 'Gültiger OBD2-Code (z. B. P0301) und Code-Infos sind erforderlich' });
    }
    const obdVin = VIN_PATTERN.test(clean(body.obdVin, 17).toUpperCase()) ? clean(body.obdVin, 17).toUpperCase() : null;
    const obdVinDecoded = obdVin ? body.obdVinDecoded : null;
    const registration = cleanRegistration(body.registration, obdVin);

    return respond(res, debug, debugAllowed, {
      tool: OBD_TOOL,
      suffix: '-obd2',
      prompt: buildObdPrompt(obdCode, codeInfo, obdVin, obdVinDecoded, registration),
      fallback: (content) => createOBD2FallbackAnalysis(content, obdCode, codeInfo),
      demo: () => createOBD2Demo(obdCode, codeInfo, obdVin, obdVinDecoded),
      demoMode: 'demo-obd2',
    });
  }

  const problem = clean(body.problem, MAX_PROBLEM_LENGTH);
  const carDetails = {
    make: clean(body.carDetails?.make),
    model: clean(body.carDetails?.model),
    year: clean(body.carDetails?.year, 4),
    engineType: clean(body.carDetails?.engineType),
  };
  if (!problem || !carDetails.make || !carDetails.model) {
    return res.status(400).json({ message: 'Problembeschreibung sowie Fahrzeugmarke und -modell sind erforderlich' });
  }
  const vin = VIN_PATTERN.test(clean(body.vin, 17).toUpperCase()) ? clean(body.vin, 17).toUpperCase() : null;
  const vinDecoded = vin ? body.vinDecoded : null;
  const registration = cleanRegistration(body.carDetails?.registration, vin);

  return respond(res, debug, debugAllowed, {
    tool: DIAGNOSE_TOOL,
    suffix: '',
    prompt: buildDiagnosePrompt(problem, carDetails, vin, vinDecoded, registration),
    fallback: (content) => createFallbackAnalysis(content),
    demo: () => createIntelligentDemo(problem, carDetails, vin, vinDecoded),
    demoMode: 'demo-diagnose',
  });
}

async function respond(res, debug, debugAllowed, { tool, suffix, prompt, fallback, demo, demoMode }) {
  const reply = ({ debug: details, modelUsed, ...rest }) =>
    res.status(200).json({
      ...rest,
      ...(debugAllowed ? { debug: details, modelUsed } : {}),
      debugAllowed,
    });
  try {
    const result = await runAI({ prompt, tool, suffix, fallback });
    if (result?.analysis) {
      return reply({ ...result, debug, timestamp: new Date().toISOString() });
    }
    return reply({
      analysis: demo(),
      demo: true,
      demoReason: result?.error ? 'error' : 'no_api_key',
      mode: result?.error ? `${demoMode}-error` : demoMode,
      modelUsed: null,
      debug,
      error: result?.error || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return reply({
      analysis: demo(),
      demo: true,
      demoReason: 'error',
      mode: `${demoMode}-error`,
      modelUsed: null,
      debug,
      error: 'Interner Fehler bei der Analyse, Demo-Ergebnis wird angezeigt.',
      timestamp: new Date().toISOString(),
    });
  }
}

// NEW: OBD2 Demo Analysis Function
function createOBD2Demo(obdCode, codeInfo, obdVin, obdVinDecoded) {
  const code = obdCode.toUpperCase();
  const vinInfo = obdVin ? ` (VIN: ${obdVin})` : '';
  
  // Vehicle-specific context from VIN
  let vehicleContext = '';
  if (obdVinDecoded && obdVinDecoded.isValid) {
    vehicleContext = ` for your ${obdVinDecoded.manufacturer?.name || 'vehicle'}${obdVinDecoded.year?.age != null ? ` (${obdVinDecoded.year.age} years old)` : ''}`;
  }

  // Enhanced analysis based on OBD code patterns
  let analysis = {
    category: codeInfo.category || 'General',
    severity: codeInfo.severity || 'Medium',
    confidence: 90
  };

  // Specific analyses for common codes
  if (code === 'P0171') {
    return {
      ...analysis,
      diagnosis: `[CLAUDE-ENHANCED] Code ${code}${vehicleContext} indicates a lean fuel mixture in Bank 1. This means the engine is receiving too much air or too little fuel.`,
      symptoms: [
        'Poor engine performance and reduced power',
        'Rough idle or engine hesitation',
        'Increased fuel consumption',
        'Possible engine knocking under load'
      ],
      possibleCauses: [
        { cause: 'Dirty or faulty Mass Air Flow (MAF) sensor', probability: 40, cost: '150-300€', urgency: 'Medium' },
        { cause: 'Vacuum leak in intake system', probability: 30, cost: '50-200€', urgency: 'Medium' },
        { cause: 'Faulty oxygen sensor', probability: 20, cost: '200-400€', urgency: 'Medium' },
        { cause: 'Clogged fuel filter or weak fuel pump', probability: 10, cost: '100-500€', urgency: 'High' }
      ],
      nextSteps: [
        'Clean or replace MAF sensor',
        'Check for vacuum leaks with smoke test',
        'Test oxygen sensor response',
        'Verify fuel pressure and flow rate'
      ],
      urgency: 'Medium - Address within 2 weeks',
      estimatedCost: '100-500€ depending on root cause'
    };
  }

  if (code === 'P0301') {
    return {
      ...analysis,
      diagnosis: `[CLAUDE-ENHANCED] Code ${code}${vehicleContext} indicates a misfire detected in cylinder 1. This can cause engine damage if not addressed promptly.`,
      symptoms: [
        'Engine shaking or vibration',
        'Loss of power and poor acceleration',
        'Rough idle',
        'Increased emissions and fuel consumption'
      ],
      possibleCauses: [
        { cause: 'Faulty spark plug in cylinder 1', probability: 50, cost: '20-50€', urgency: 'Medium' },
        { cause: 'Defective ignition coil', probability: 30, cost: '100-250€', urgency: 'Medium' },
        { cause: 'Low compression in cylinder 1', probability: 15, cost: '500-2000€', urgency: 'High' },
        { cause: 'Fuel injector problem', probability: 5, cost: '200-600€', urgency: 'High' }
      ],
      nextSteps: [
        'Replace spark plug in cylinder 1',
        'Swap ignition coil with another cylinder to test',
        'Perform compression test',
        'Check fuel injector operation'
      ],
      urgency: 'High - Address immediately to prevent engine damage',
      estimatedCost: '20-2000€ depending on root cause'
    };
  }

  if (code === 'P0420') {
    return {
      ...analysis,
      diagnosis: `[CLAUDE-ENHANCED] Code ${code}${vehicleContext} indicates catalyst system efficiency below threshold for Bank 1. The catalytic converter is not performing optimally.`,
      symptoms: [
        'Reduced fuel economy',
        'Failed emissions test',
        'Possible sulfur smell from exhaust',
        'Engine may run normally otherwise'
      ],
      possibleCauses: [
        { cause: 'Worn out catalytic converter', probability: 60, cost: '400-1200€', urgency: 'Medium' },
        { cause: 'Faulty oxygen sensors', probability: 25, cost: '200-500€', urgency: 'Medium' },
        { cause: 'Engine running too rich or lean', probability: 10, cost: '100-400€', urgency: 'Medium' },
        { cause: 'Exhaust leak near sensors', probability: 5, cost: '50-300€', urgency: 'Low' }
      ],
      nextSteps: [
        'Test oxygen sensor response',
        'Check for exhaust leaks',
        'Verify engine fuel mixture',
        'Replace catalytic converter if confirmed faulty'
      ],
      urgency: 'Medium - Required for emissions compliance',
      estimatedCost: '100-1200€ depending on root cause'
    };
  }

  // Generic analysis for other codes
  return {
    ...analysis,
    diagnosis: `[CLAUDE-ANALYSIS] Code ${code}${vehicleContext}: ${codeInfo.description || 'Diagnostic trouble code detected'}. This ${codeInfo.severity?.toLowerCase() || 'medium'} priority issue requires attention.`,
    symptoms: codeInfo.symptoms || [
      'Check engine light illuminated',
      'Possible performance issues',
      'May affect vehicle operation'
    ],
    possibleCauses: codeInfo.commonCauses || [
      'Component malfunction or wear',
      'Electrical connection issues',
      'System calibration problems'
    ],
    nextSteps: [
      'Verify code with professional diagnostic scanner',
      'Check related components and wiring',
      'Follow manufacturer service procedures',
      'Clear code after repair and test drive'
    ],
    urgency: `${codeInfo.severity || 'Medium'} priority - Consult service manual for specific procedures`,
    estimatedCost: 'Varies by specific component and labor requirements'
  };
}

// Existing diagnose demo function (preserved)
function createIntelligentDemo(problem, carDetails, vin, vinDecoded) {
  const problemLower = problem.toLowerCase();
  const vinInfo = vin ? ` (VIN: ${vin})` : '';
  
  // Enhanced vehicle-specific hints using decoded VIN data
  const getVehicleSpecificHint = () => {
    const hints = [];
    
    if (!vin) return null;
    
    // Basic WMI-based hints
    const wmi = vin.substring(0, 3).toUpperCase();
    const basicHints = {
      'WBA': 'BMW vehicles of this series are known for water pump issues after 80,000km',
      'WDB': 'Mercedes-Benz models frequently have air suspension problems after 100,000km',
      'WDD': 'Mercedes-Benz models frequently have air suspension problems after 100,000km',
      'WAU': 'Audi vehicles often show problems with the direct injection system',
      'WVW': 'Volkswagen models have known DSG transmission problems at higher mileage'
    };
    
    if (basicHints[wmi]) {
      hints.push(basicHints[wmi]);
    }
    
    // Enhanced hints using decoded VIN data
    if (vinDecoded && vinDecoded.isValid) {
      const { manufacturer, year } = vinDecoded;
      
      // Age-specific recommendations
      if (year?.age > 10) {
        hints.push(`Vehicle is ${year.age} years old - consider preventive maintenance for aging components`);
      }
      
      // Manufacturer-specific patterns
      if (manufacturer?.name === 'BMW' && year?.age > 5) {
        hints.push('BMW vehicles of this age commonly develop cooling system issues');
      }
    }
    
    return hints.length ? hints.join(' | ') : 'Vehicle-specific diagnostic information available';
  };

  // Add VIN context to diagnosis
  let vinSpecificContext = '';
  if (vinDecoded && vinDecoded.isValid) {
    vinSpecificContext = ` Based on VIN analysis, this ${vinDecoded.manufacturer?.name || 'vehicle'}${vinDecoded.year?.age != null ? ` (${vinDecoded.year.age} years old)` : ''} shows`;
  }

  // Enhanced starter problems analysis
  if (problemLower.includes('springt nicht an') || problemLower.includes('startet nicht') || problemLower.includes('anlasser')) {
    return {
      diagnosis: `[VIN-ENHANCED] Based on your description "${problem}" for your ${carDetails.make} ${carDetails.model}${vinInfo}${vinSpecificContext} typical starter system issues. The clicking sound during start attempts indicates a faulty starter motor or weak battery.`,
      confidence: 92,
      possibleCauses: [
        { cause: "Faulty starter motor", probability: 75, cost: "250-450€", commonFor: "Common at this age" },
        { cause: "Weak/defective battery", probability: 20, cost: "80-150€", commonFor: "General" },
        { cause: "Corroded battery terminals", probability: 5, cost: "10-30€", commonFor: "Older vehicles" }
      ],
      nextSteps: [
        "Check battery voltage with multimeter (>12.4V)",
        "Inspect battery terminals for corrosion",
        "Have starter tested by qualified technician",
        "Perform appropriate repair if confirmed"
      ],
      urgency: "High - Vehicle currently inoperable",
      vehicleSpecific: getVehicleSpecificHint(),
      maintenanceRecommendations: vinDecoded?.year?.age > 5 ? 'Consider comprehensive inspection due to vehicle age' : null
    };
  }

  // Generic fallback
  return {
    diagnosis: `[CLAUDE-DEMO] Analysis of "${problem}" for ${carDetails.make} ${carDetails.model} ${carDetails.year}${vinInfo}. This appears to be a ${carDetails.engineType || 'standard'} engine issue requiring further investigation.`,
    confidence: 85,
    possibleCauses: [
      { cause: "Component wear or malfunction", probability: 60, cost: "100-500€" },
      { cause: "Electrical system issue", probability: 25, cost: "50-300€" },
      { cause: "Maintenance related", probability: 15, cost: "50-200€" }
    ],
    nextSteps: [
      "Perform detailed diagnostic scan",
      "Check related systems and components",
      "Consult service documentation",
      "Consider professional inspection"
    ],
    urgency: "Medium - Schedule service appointment",
    vehicleSpecific: getVehicleSpecificHint(),
    recalls: null
  };
}