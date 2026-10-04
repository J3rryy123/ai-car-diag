import DTC_DATABASE, { getSystemHint } from './dtcDatabase';

const OBD2_DECODER = {
  decodeCode: (code) => {
    const upperCode = code.toUpperCase();
    return DTC_DATABASE[upperCode] || {
      description: 'Unbekannter Fehlercode',
      severity: 'Unbekannt',
      category: 'Allgemein',
      systemHint: getSystemHint(upperCode),
      commonCauses: ['Weitere Diagnose erforderlich'],
      symptoms: ['Siehe Fahrzeughandbuch oder professionelle Diagnose']
    };
  },

// Additional helper functions to extend functionality

// Get severity level as number for sorting
getSeverityLevel: (code) => {
  const info = OBD2_DECODER.decodeCode(code);
  const severityMap = {
    'Low': 1,
    'Medium': 2,
    'High': 3,
    'Critical': 4
  };
  return severityMap[info.severity] || 0;
},

// Get all codes by category
getCodesByCategory: (category) => {
  const codes = [];
  // This would iterate through all codes in codeMap
  // Implementation depends on making codeMap accessible
  return codes;
},

// Get codes by severity
getCodesBySeverity: (severity) => {
  const codes = [];
  // This would iterate through all codes in codeMap
  // Implementation depends on making codeMap accessible
  return codes;
},

// Enhanced code validation with more specific patterns
isValidDTCFormat: (code) => {
  // More specific validation patterns
  const patterns = {
    powertrain: /^P[0-3][0-9]{3}$/i,
    body: /^B[0-3][0-9]{3}$/i,
    chassis: /^C[0-3][0-9]{3}$/i,
    network: /^U[0-3][0-9]{3}$/i
  };
  
  return Object.values(patterns).some(pattern => pattern.test(code));
},

// Get diagnostic tips based on code pattern
getDiagnosticTips: (code) => {
  const prefix = code.charAt(0).toUpperCase();
  const secondDigit = code.charAt(1);
  
  const tips = [];
  
  if (prefix === 'P') {
    if (secondDigit === '0') {
      tips.push('Generic powertrain code - check with multiple scan tools');
      tips.push('Verify repair with test drive after clearing codes');
    } else if (secondDigit === '1') {
      tips.push('Manufacturer specific code - consult service manual');
    }
  }
  
  // Add misfire specific tips
  if (code.match(/^P030[1-9]$/i)) {
    tips.push('For misfires: Check spark plugs, coils, and compression');
    tips.push('Swap coil/plug to different cylinder to isolate problem');
  }
  
  // Add oxygen sensor tips
  if (code.match(/^P01[3-5][0-9]$/i)) {
    tips.push('For O2 sensors: Check for exhaust leaks first');
    tips.push('Allow engine to warm up before testing sensor response');
  }
  
  return tips;
}
  
};

export default OBD2_DECODER;