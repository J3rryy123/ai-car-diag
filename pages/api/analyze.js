export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // FIXED: Handle both diagnose and OBD2 request types
  const requestType = req.body.type || 'diagnose';
  
  let debugInfo = {
    hasClaudeKey: !!process.env.CLAUDE_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    environment: process.env.NODE_ENV,
    requestType: requestType
  };

  if (requestType === 'obd2') {
    // Handle OBD2 analysis requests
    const { type, obdCode, obdVin, obdVinDecoded, codeInfo, aiModel } = req.body;
    
    if (!obdCode || !codeInfo) {
      return res.status(400).json({ message: 'OBD code and code info are required for OBD2 analysis' });
    }

    // Enhanced debug info for OBD2
    debugInfo = {
      ...debugInfo,
      selectedModel: aiModel,
      hasOBDCode: !!obdCode,
      hasCodeInfo: !!codeInfo,
      hasVIN: !!obdVin,
      hasVinDecoded: !!obdVinDecoded,
      vinValid: obdVinDecoded?.isValid || false,
      manufacturer: obdVinDecoded?.manufacturer?.name || 'Unknown'
    };

    console.log('OBD2 API Debug Info:', debugInfo);

    try {
      let analysis;
      let apiUsed = 'demo';
      let errorDetails = null;
      let modelUsed = null;

      // Create enhanced prompt for OBD2 analysis
      let vehicleContext = '';
      if (obdVinDecoded && obdVinDecoded.isValid) {
        vehicleContext = `
VIN: ${obdVin}
VIN Analysis:
- Manufacturer: ${obdVinDecoded.manufacturer?.name || 'Unknown'} (${obdVinDecoded.manufacturer?.country || 'Unknown'})
- Vehicle Age: ${obdVinDecoded.year?.age || 'Unknown'} years (Model Year: ${obdVinDecoded.year?.modelYear || 'Unknown'})
- Engine: ${obdVinDecoded.engine?.fuelType || 'Unknown'}
- Configuration: ${obdVinDecoded.engine?.configuration || 'Unknown'}
`;
      }

      const obdPrompt = `Analyze the following OBD2 diagnostic trouble code as an expert automotive technician:

OBD2 Code: ${obdCode}
Code Description: ${codeInfo.description || 'Unknown'}
Code Category: ${codeInfo.category || 'General'}
Code Severity: ${codeInfo.severity || 'Medium'}

${vehicleContext}

Please provide a structured response in the following JSON format:
{
  "diagnosis": "Detailed technical analysis of the code with vehicle-specific considerations",
  "category": "${codeInfo.category || 'General'}",
  "severity": "${codeInfo.severity || 'Medium'}",
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
}`;

      // Try Claude API for OBD2
      if (process.env.CLAUDE_API_KEY && aiModel === 'claude') {
        const claudeModels = [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ];

        for (const model of claudeModels) {
          try {
            console.log(`Attempting Claude API call for OBD2 with model: ${model}`);
            
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
                  content: obdPrompt
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
                  apiUsed = 'claude-obd2';
                  modelUsed = model;
                  console.log(`Claude API Success for OBD2 with model: ${model}`);
                  break;
                } else {
                  throw new Error('No JSON found in Claude response');
                }
              } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                analysis = createOBD2FallbackAnalysis(content, obdCode, codeInfo);
                apiUsed = 'claude-obd2-fallback';
                modelUsed = model;
                break;
              }
            } else {
              const errorText = await response.text();
              console.error(`Claude API Error with model ${model}:`, response.status, errorText);
              
              if (response.status === 404) {
                continue;
              } else {
                throw new Error(`Claude API Error: ${response.status} - ${errorText}`);
              }
            }
          } catch (modelError) {
            console.error(`Error with Claude model ${model}:`, modelError);
            if (model === claudeModels[claudeModels.length - 1]) {
              errorDetails = `All Claude models failed for OBD2. Last error: ${modelError.message}`;
            }
          }
        }
      }

      // Try OpenAI API for OBD2 if Claude didn't work
      if (!analysis && process.env.OPENAI_API_KEY && aiModel === 'chatgpt') {
        const openaiModels = [
          'gpt-4o-mini',
          'gpt-4o',
          'gpt-4-turbo',
          'gpt-4',
          'gpt-3.5-turbo'
        ];

        for (const model of openaiModels) {
          try {
            console.log(`Attempting OpenAI API call for OBD2 with model: ${model}`);
            
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
                  content: obdPrompt
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
                  apiUsed = 'openai-obd2';
                  modelUsed = model;
                  console.log(`OpenAI API Success for OBD2 with model: ${model}`);
                  break;
                } else {
                  throw new Error('No JSON found in OpenAI response');
                }
              } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                analysis = createOBD2FallbackAnalysis(content, obdCode, codeInfo);
                apiUsed = 'openai-obd2-fallback';
                modelUsed = model;
                break;
              }
            } else {
              const errorText = await response.text();
              console.error(`OpenAI API Error with model ${model}:`, response.status, errorText);
              
              if (response.status === 404) {
                continue;
              } else {
                throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
              }
            }
          } catch (modelError) {
            console.error(`Error with OpenAI model ${model}:`, modelError);
            if (model === openaiModels[openaiModels.length - 1]) {
              errorDetails = `All OpenAI models failed for OBD2. Last error: ${modelError.message}`;
            }
          }
        }
      }

      // Fallback to demo mode for OBD2
      if (!analysis) {
        analysis = createOBD2Demo(obdCode, codeInfo, obdVin, obdVinDecoded, aiModel);
        apiUsed = 'demo-obd2';
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
      console.error('OBD2 Analysis Error:', error);
      
      const demoAnalysis = createOBD2Demo(obdCode, codeInfo, obdVin, obdVinDecoded, aiModel);
      
      res.status(200).json({
        analysis: demoAnalysis,
        mode: 'demo-obd2-error',
        debug: debugInfo,
        error: error.message,
        note: 'Fallback to demo mode due to error'
      });
    }

  } else {
    // Handle regular diagnose requests (existing code)
    const { problem, carDetails, aiModel, vin, vinDecoded } = req.body;

    if (!problem || !carDetails) {
      return res.status(400).json({ message: 'Problem and vehicle data are required' });
    }

    // Enhanced debug info for diagnose
    debugInfo = {
      ...debugInfo,
      selectedModel: aiModel,
      hasVIN: !!vin,
      hasVinDecoded: !!vinDecoded,
      vinValid: vinDecoded?.isValid || false,
      manufacturer: vinDecoded?.manufacturer?.name || 'Unknown'
    };

    console.log('Diagnose API Debug Info:', debugInfo);

    try {
      let analysis;
      let apiUsed = 'demo';
      let errorDetails = null;
      let modelUsed = null;

      // Enhanced prompt creation with full VIN context
      let vehicleInfo = `${carDetails.make} ${carDetails.model} ${carDetails.year}`;
      if (carDetails.engineType) {
        vehicleInfo += `, Engine: ${carDetails.engineType}`;
      }

      // Add comprehensive VIN information to the prompt
      let vinContext = '';
      if (vin && vinDecoded && vinDecoded.isValid) {
        vinContext = `
VIN: ${vin}
VIN Analysis:
- Manufacturer: ${vinDecoded.manufacturer?.name || 'Unknown'} (${vinDecoded.manufacturer?.country || 'Unknown'})
- Assembly Plant: ${vinDecoded.manufacturer?.assemblyPlant || 'Unknown'}
- Vehicle Age: ${vinDecoded.year?.age || 'Unknown'} years (Model Year: ${vinDecoded.year?.modelYear || 'Unknown'})
- Engine: ${vinDecoded.engine?.name || 'Unknown'} - ${vinDecoded.engine?.fuelType || 'Unknown'}
- Engine Configuration: ${vinDecoded.engine?.configuration || 'Unknown'}
- Displacement: ${vinDecoded.engine?.displacement || 'Unknown'}
- Turbo: ${vinDecoded.engine?.turbo ? 'Yes' : 'No'}
- Market: ${vinDecoded.market?.primaryMarket || 'Unknown'}
`;
      }

      const prompt = `Analyze the following automotive problem as an expert mechanic:

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
}`;

      // Try AI APIs if available for diagnose
      if (process.env.CLAUDE_API_KEY && aiModel === 'claude') {
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

              try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  analysis = JSON.parse(jsonMatch[0]);
                  apiUsed = 'claude';
                  modelUsed = model;
                  console.log(`Claude API Success with model: ${model}`);
                  break;
                } else {
                  throw new Error('No JSON found in Claude response');
                }
              } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                analysis = createFallbackAnalysis(content, 'claude');
                apiUsed = 'claude-fallback';
                modelUsed = model;
                break;
              }
            } else {
              const errorText = await response.text();
              console.error(`Claude API Error with model ${model}:`, response.status, errorText);
              
              if (response.status === 404) {
                continue;
              } else {
                throw new Error(`Claude API Error: ${response.status} - ${errorText}`);
              }
            }
          } catch (modelError) {
            console.error(`Error with Claude model ${model}:`, modelError);
            if (model === claudeModels[claudeModels.length - 1]) {
              errorDetails = `All Claude models failed. Last error: ${modelError.message}`;
            }
          }
        }
      }

      if (!analysis && process.env.OPENAI_API_KEY && aiModel === 'chatgpt') {
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
                  throw new Error('No JSON found in OpenAI response');
                }
              } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                analysis = createFallbackAnalysis(content, 'openai');
                apiUsed = 'openai-fallback';
                modelUsed = model;
                break;
              }
            } else {
              const errorText = await response.text();
              console.error(`OpenAI API Error with model ${model}:`, response.status, errorText);
              
              if (response.status === 404) {
                continue;
              } else {
                throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
              }
            }
          } catch (modelError) {
            console.error(`Error with OpenAI model ${model}:`, modelError);
            if (model === openaiModels[openaiModels.length - 1]) {
              errorDetails = `All OpenAI models failed. Last error: ${modelError.message}`;
            }
          }
        }
      }

      // Fallback to demo mode
      if (!analysis) {
        analysis = createIntelligentDemo(problem, carDetails, aiModel, vin, vinDecoded);
        apiUsed = 'demo-diagnose';
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
      console.error('Diagnose Analysis Error:', error);
      
      const demoAnalysis = createIntelligentDemo(problem, carDetails, aiModel, vin, vinDecoded);
      
      res.status(200).json({
        analysis: demoAnalysis,
        mode: 'demo-diagnose-error',
        debug: debugInfo,
        error: error.message,
        note: 'Fallback to demo mode due to error'
      });
    }
  }
}

// NEW: OBD2 Demo Analysis Function
function createOBD2Demo(obdCode, codeInfo, obdVin, obdVinDecoded, aiModel) {
  const code = obdCode.toUpperCase();
  const vinInfo = obdVin ? ` (VIN: ${obdVin})` : '';
  
  // Vehicle-specific context from VIN
  let vehicleContext = '';
  if (obdVinDecoded && obdVinDecoded.isValid) {
    vehicleContext = ` for your ${obdVinDecoded.year?.age || 'unknown'}-year-old ${obdVinDecoded.manufacturer?.name || 'vehicle'} with ${obdVinDecoded.engine?.fuelType || 'unknown'} engine`;
  }

  // Enhanced analysis based on OBD code patterns
  let analysis = {
    category: codeInfo.category || 'General',
    severity: codeInfo.severity || 'Medium',
    confidence: aiModel === 'claude' ? 90 : 85
  };

  // Specific analyses for common codes
  if (code === 'P0171') {
    return {
      ...analysis,
      diagnosis: `[${aiModel.toUpperCase()}-ENHANCED] Code ${code}${vehicleContext} indicates a lean fuel mixture in Bank 1. This means the engine is receiving too much air or too little fuel.`,
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
      diagnosis: `[${aiModel.toUpperCase()}-ENHANCED] Code ${code}${vehicleContext} indicates a misfire detected in cylinder 1. This can cause engine damage if not addressed promptly.`,
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
      diagnosis: `[${aiModel.toUpperCase()}-ENHANCED] Code ${code}${vehicleContext} indicates catalyst system efficiency below threshold for Bank 1. The catalytic converter is not performing optimally.`,
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
    diagnosis: `[${aiModel.toUpperCase()}-ANALYSIS] Code ${code}${vehicleContext}: ${codeInfo.description || 'Diagnostic trouble code detected'}. This ${codeInfo.severity?.toLowerCase() || 'medium'} priority issue requires attention.`,
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
function createIntelligentDemo(problem, carDetails, aiModel, vin, vinDecoded) {
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
      const { manufacturer, engine, year } = vinDecoded;
      
      // Age-specific recommendations
      if (year?.age > 10) {
        hints.push(`Vehicle is ${year.age} years old - consider preventive maintenance for aging components`);
      }
      
      // Engine-specific hints
      if (engine?.turbo) {
        hints.push('Turbocharged engine - pay attention to oil quality and change intervals');
      }
      
      // Manufacturer-specific patterns
      if (manufacturer?.name === 'BMW' && year?.age > 5) {
        hints.push('BMW vehicles of this age commonly develop cooling system issues');
      }
    }
    
    return hints.length ? hints.join(' | ') : 'Vehicle-specific diagnostic information available';
  };

  // Get recall information based on VIN
  const getRecallInfo = () => {
    if (!vinDecoded || !vinDecoded.isValid) return null;
    
    const { manufacturer, year } = vinDecoded;
    const recalls = [];
    
    // Example recall database
    if (manufacturer?.name === 'BMW' && year?.modelYear >= 2010 && year?.modelYear <= 2016) {
      recalls.push('Timing chain inspection recommended');
    }
    if (manufacturer?.name === 'Mercedes-Benz' && year?.modelYear >= 2015 && year?.modelYear <= 2018) {
      recalls.push('AdBlue system software update');
    }
    if (manufacturer?.name === 'Audi' && year?.modelYear >= 2012 && year?.modelYear <= 2017) {
      recalls.push('Oil consumption monitoring program');
    }
    
    return recalls.length > 0 ? recalls.join(', ') : null;
  };

  // Add VIN context to diagnosis
  let vinSpecificContext = '';
  if (vinDecoded && vinDecoded.isValid) {
    vinSpecificContext = ` Based on VIN analysis, this ${vinDecoded.year?.age || 'unknown'}-year-old ${vinDecoded.manufacturer?.name || 'vehicle'} with ${vinDecoded.engine?.fuelType || 'unknown'} engine shows`;
  }

  // Enhanced starter problems analysis
  if (problemLower.includes('springt nicht an') || problemLower.includes('startet nicht') || problemLower.includes('anlasser')) {
    return {
      diagnosis: `[VIN-ENHANCED] Based on your description "${problem}" for your ${carDetails.make} ${carDetails.model}${vinInfo}${vinSpecificContext} typical starter system issues. The clicking sound during start attempts indicates a faulty starter motor or weak battery.`,
      confidence: aiModel === 'claude' ? 92 : 88,
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
      recalls: getRecallInfo(),
      maintenanceRecommendations: vinDecoded?.year?.age > 5 ? 'Consider comprehensive inspection due to vehicle age' : null
    };
  }

  // Generic fallback
  return {
    diagnosis: `[${aiModel.toUpperCase()}-DEMO] Analysis of "${problem}" for ${carDetails.make} ${carDetails.model} ${carDetails.year}${vinInfo}. This appears to be a ${carDetails.engineType || 'standard'} engine issue requiring further investigation.`,
    confidence: aiModel === 'claude' ? 85 : 80,
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
    recalls: getRecallInfo()
  };
}