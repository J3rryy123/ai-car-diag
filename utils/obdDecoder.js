const OBD2_DECODER = {
  decodeCode: (code) => {
    const codeMap = {
      'P0171': {
        description: 'System zu mager (Bank 1)',
        severity: 'Mittel',
        category: 'Kraftstoffsystem',
        commonCauses: ['Defekte Lambdasonde', 'Undichtigkeit im Ansaugsystem', 'Verstopfter Luftfilter', 'Defekte Kraftstoffpumpe'],
        symptoms: ['Unrunder Leerlauf', 'Schlechte Beschleunigung', 'Erhöhter Kraftstoffverbrauch']
      },
      'P0301': {
        description: 'Zündaussetzer Zylinder 1',
        severity: 'Hoch',
        category: 'Zündsystem',
        commonCauses: ['Defekte Zündkerze', 'Defekte Zündspule', 'Niedriger Kompressionsdruck', 'Verstopfte Einspritzdüse'],
        symptoms: ['Motor ruckelt', 'Leistungsverlust', 'Unrunder Leerlauf', 'Erhöhte Emissionen']
      },
      'P0302': {
        description: 'Zündaussetzer Zylinder 2',
        severity: 'Hoch',
        category: 'Zündsystem',
        commonCauses: ['Defekte Zündkerze', 'Defekte Zündspule', 'Niedriger Kompressionsdruck', 'Verstopfte Einspritzdüse'],
        symptoms: ['Motor ruckelt', 'Leistungsverlust', 'Unrunder Leerlauf', 'Erhöhte Emissionen']
      },
      'P0420': {
        description: 'Katalysator-System, Bank 1',
        severity: 'Mittel',
        category: 'Abgassystem',
        commonCauses: ['Defekter Katalysator', 'Defekte Lambdasonde', 'Motorprobleme', 'Verschmutzung'],
        symptoms: ['Reduzierte Abgasreinigung', 'Möglicher TÜV-Ausfall', 'Gelbe Motorkontrollleuchte']
      },
      'P0128': {
        description: 'Kühlmitteltemperatur zu niedrig',
        severity: 'Niedrig',
        category: 'Kühlsystem',
        commonCauses: ['Defekter Thermostat', 'Niedriger Kühlmittelstand', 'Defekter Temperatursensor'],
        symptoms: ['Verlängerte Warmlaufzeit', 'Heizung funktioniert schlecht', 'Erhöhter Kraftstoffverbrauch']
      },
      'P0440': {
        description: 'Tankentlüftungssystem',
        severity: 'Niedrig',
        category: 'Kraftstoffsystem',
        commonCauses: ['Defekte Tankdeckeldichtung', 'Undichtigkeit in Leitungen', 'Defektes Tankentlüftungsventil'],
        symptoms: ['Kraftstoffgeruch', 'Schwierigkeiten beim Tanken', 'Motorkontrollleuchte']
      },
      'P0446': {
        description: 'Tankentlüftung verstopft',
        severity: 'Niedrig',
        category: 'Kraftstoffsystem',
        commonCauses: ['Verstopfte Entlüftungsleitung', 'Defektes Entlüftungsventil', 'Spinne oder Schmutz im System'],
        symptoms: ['Schwierigkeiten beim Tanken', 'Kraftstoffgeruch', 'Motorkontrollleuchte']
      },
      'P0507': {
        description: 'Leerlaufdrehzahl zu hoch',
        severity: 'Mittel',
        category: 'Motorsteuerung',
        commonCauses: ['Defektes Leerlaufstellventil', 'Undichtigkeit im Ansaugsystem', 'Falsche Kalibrierung'],
        symptoms: ['Hoher Leerlauf', 'Erhöhter Kraftstoffverbrauch', 'Unrunder Motor']
      },
      'P0506': {
        description: 'Leerlaufdrehzahl zu niedrig',
        severity: 'Mittel',
        category: 'Motorsteuerung',
        commonCauses: ['Verstopftes Leerlaufstellventil', 'Defekter Leerlaufregler', 'Ansaugluftleck'],
        symptoms: ['Niedriger Leerlauf', 'Motor geht aus', 'Unrunder Leerlauf']
      },
      'P0174': {
        description: 'System zu mager (Bank 2)',
        severity: 'Mittel',
        category: 'Kraftstoffsystem',
        commonCauses: ['Defekte Lambdasonde Bank 2', 'Undichtigkeit im Ansaugsystem', 'Kraftstoffpumpe schwach'],
        symptoms: ['Unrunder Leerlauf', 'Schlechte Beschleunigung', 'Erhöhter Kraftstoffverbrauch']
      },
      'P0172': {
        description: 'System zu fett (Bank 1)',
        severity: 'Mittel',
        category: 'Kraftstoffsystem',
        commonCauses: ['Defekte Lambdasonde', 'Verschmutzter Luftmassenmesser', 'Undichte Einspritzdüsen'],
        symptoms: ['Schwarzer Rauch', 'Erhöhter Kraftstoffverbrauch', 'Unrunder Leerlauf']
      },

      'P0303': {
        description: 'Cylinder 3 Misfire Detected',
        severity: 'High',
        category: 'Ignition System',
        commonCauses: ['Faulty spark plug', 'Faulty ignition coil', 'Low compression', 'Clogged fuel injector'],
        symptoms: ['Engine roughness', 'Power loss', 'Rough idle', 'Increased emissions']
      },

      'P0304': {
        description: 'Cylinder 4 Misfire Detected',
        severity: 'High',
        category: 'Ignition System',
        commonCauses: ['Faulty spark plug', 'Faulty ignition coil', 'Low compression', 'Clogged fuel injector'],
        symptoms: ['Engine roughness', 'Power loss', 'Rough idle', 'Increased emissions']
      },

      'P0305': {
        description: 'Cylinder 5 Misfire Detected',
        severity: 'High',
        category: 'Ignition System',
        commonCauses: ['Faulty spark plug', 'Faulty ignition coil', 'Low compression', 'Clogged fuel injector'],
        symptoms: ['Engine roughness', 'Power loss', 'Rough idle', 'Increased emissions']
      },

      'P0306': {
        description: 'Cylinder 6 Misfire Detected',
        severity: 'High',
        category: 'Ignition System',
        commonCauses: ['Faulty spark plug', 'Faulty ignition coil', 'Low compression', 'Clogged fuel injector'],
        symptoms: ['Engine roughness', 'Power loss', 'Rough idle', 'Increased emissions']
      },

      // Oxygen Sensor Codes
      'P0130': {
        description: 'O2 Sensor Circuit Bank 1 Sensor 1',
        severity: 'Medium',
        category: 'Fuel System',
        commonCauses: ['Faulty oxygen sensor', 'Wiring issues', 'Exhaust leak', 'Engine running rich/lean'],
        symptoms: ['Poor fuel economy', 'Emission test failure', 'Rough idle']
      },

      'P0131': {
        description: 'O2 Sensor Circuit Low Voltage Bank 1 Sensor 1',
        severity: 'Medium',
        category: 'Fuel System',
        commonCauses: ['Faulty oxygen sensor', 'Wiring short to ground', 'Exhaust leak'],
        symptoms: ['Poor fuel economy', 'Black smoke', 'Engine runs rich']
      },

      'P0132': {
        description: 'O2 Sensor Circuit High Voltage Bank 1 Sensor 1',
        severity: 'Medium',
        category: 'Fuel System',
        commonCauses: ['Faulty oxygen sensor', 'Wiring short to power', 'Fuel injector leak'],
        symptoms: ['Poor fuel economy', 'Engine runs lean', 'Hesitation']
      },

      'P0133': {
        description: 'O2 Sensor Circuit Slow Response Bank 1 Sensor 1',
        severity: 'Medium',
        category: 'Fuel System',
        commonCauses: ['Aged oxygen sensor', 'Contaminated sensor', 'Exhaust leak', 'Engine oil contamination'],
        symptoms: ['Poor fuel economy', 'Sluggish performance', 'Failed emissions test']
      },

      // Mass Airflow Sensor Codes
      'P0100': {
        description: 'Mass Airflow Sensor Circuit',
        severity: 'Medium',
        category: 'Engine Management',
        commonCauses: ['Faulty MAF sensor', 'Dirty air filter', 'Wiring issues', 'Intake air leak'],
        symptoms: ['Rough idle', 'Stalling', 'Poor acceleration', 'Black smoke']
      },

      'P0101': {
        description: 'Mass Airflow Sensor Range/Performance',
        severity: 'Medium',
        category: 'Engine Management',
        commonCauses: ['Dirty MAF sensor', 'Air filter clogged', 'Intake leak', 'Faulty sensor'],
        symptoms: ['Poor fuel economy', 'Rough idle', 'Hesitation during acceleration']
      },

      'P0102': {
        description: 'Mass Airflow Sensor Circuit Low Input',
        severity: 'Medium',
        category: 'Engine Management',
        commonCauses: ['Faulty MAF sensor', 'Wiring short to ground', 'Open circuit'],
        symptoms: ['Engine won\'t start', 'Stalling', 'Poor performance']
      },

      'P0103': {
        description: 'Mass Airflow Sensor Circuit High Input',
        severity: 'Medium',
        category: 'Engine Management',
        commonCauses: ['Faulty MAF sensor', 'Wiring short to power', 'Dirty sensor'],
        symptoms: ['Rich fuel mixture', 'Black smoke', 'Poor fuel economy']
      },

      // Throttle Position Sensor Codes
      'P0120': {
        description: 'Throttle Position Sensor Circuit',
        severity: 'Medium',
        category: 'Engine Management',
        commonCauses: ['Faulty TPS', 'Wiring issues', 'Corroded connections', 'Throttle body problems'],
        symptoms: ['Irregular idle', 'Poor acceleration', 'Stalling', 'Surging']
      },

      'P0121': {
        description: 'Throttle Position Sensor Range/Performance',
        severity: 'Medium',
        category: 'Engine Management',
        commonCauses: ['Faulty TPS', 'Dirty throttle body', 'Wiring issues', 'Calibration needed'],
        symptoms: ['Erratic idle', 'Hesitation', 'Poor throttle response']
      },

      // Engine Coolant Temperature Codes
      'P0115': {
        description: 'Engine Coolant Temperature Sensor Circuit',
        severity: 'Medium',
        category: 'Cooling System',
        commonCauses: ['Faulty ECT sensor', 'Wiring issues', 'Corroded connections', 'Low coolant'],
        symptoms: ['Poor fuel economy', 'Hard starting', 'Overheating', 'Fan always on']
      },

      'P0116': {
        description: 'Engine Coolant Temperature Sensor Range/Performance',
        severity: 'Medium',
        category: 'Cooling System',
        commonCauses: ['Faulty ECT sensor', 'Thermostat stuck', 'Low coolant level', 'Air in cooling system'],
        symptoms: ['Poor fuel economy', 'Extended warm-up time', 'Temperature gauge issues']
      },

      // Knock Sensor Codes
      'P0325': {
        description: 'Knock Sensor 1 Circuit',
        severity: 'Medium',
        category: 'Engine Management',
        commonCauses: ['Faulty knock sensor', 'Wiring issues', 'Engine knock', 'Carbon buildup'],
        symptoms: ['Reduced performance', 'Engine ping/knock', 'Poor acceleration']
      },

      'P0326': {
        description: 'Knock Sensor 1 Circuit Range/Performance',
        severity: 'Medium',
        category: 'Engine Management',
        commonCauses: ['Faulty knock sensor', 'Engine knock', 'Wrong octane fuel', 'Carbon deposits'],
        symptoms: ['Engine pinging', 'Reduced power', 'Poor fuel economy']
      },

      // Camshaft Position Sensor Codes
      'P0340': {
        description: 'Camshaft Position Sensor Circuit',
        severity: 'High',
        category: 'Engine Management',
        commonCauses: ['Faulty camshaft sensor', 'Wiring issues', 'Timing chain/belt problems', 'ECM issues'],
        symptoms: ['No start condition', 'Rough idle', 'Stalling', 'Poor performance']
      },

      'P0341': {
        description: 'Camshaft Position Sensor Range/Performance',
        severity: 'High',
        category: 'Engine Management',
        commonCauses: ['Faulty camshaft sensor', 'Timing issues', 'Wiring problems', 'Reluctor wheel damage'],
        symptoms: ['Rough idle', 'Hard starting', 'Misfiring', 'Stalling']
      },

      // Crankshaft Position Sensor Codes
      'P0335': {
        description: 'Crankshaft Position Sensor Circuit',
        severity: 'High',
        category: 'Engine Management',
        commonCauses: ['Faulty crankshaft sensor', 'Wiring issues', 'Reluctor wheel damage', 'ECM problems'],
        symptoms: ['No start condition', 'Stalling', 'Intermittent starting issues']
      },

      'P0336': {
        description: 'Crankshaft Position Sensor Range/Performance',
        severity: 'High',
        category: 'Engine Management',
        commonCauses: ['Faulty crankshaft sensor', 'Timing problems', 'Reluctor wheel issues', 'Wiring problems'],
        symptoms: ['Rough idle', 'Misfiring', 'Stalling', 'Poor performance']
      },

      // Fuel Injector Codes
      'P0201': {
        description: 'Injector 1 Circuit',
        severity: 'Medium',
        category: 'Fuel System',
        commonCauses: ['Faulty fuel injector', 'Wiring issues', 'ECM problems', 'Fuel rail issues'],
        symptoms: ['Rough idle', 'Misfiring', 'Poor fuel economy', 'Black smoke']
      },

      'P0202': {
        description: 'Injector 2 Circuit',
        severity: 'Medium',
        category: 'Fuel System',
        commonCauses: ['Faulty fuel injector', 'Wiring issues', 'ECM problems', 'Fuel rail issues'],
        symptoms: ['Rough idle', 'Misfiring', 'Poor fuel economy', 'Black smoke']
      },

      'P0203': {
        description: 'Injector 3 Circuit',
        severity: 'Medium',
        category: 'Fuel System',
        commonCauses: ['Faulty fuel injector', 'Wiring issues', 'ECM problems', 'Fuel rail issues'],
        symptoms: ['Rough idle', 'Misfiring', 'Poor fuel economy', 'Black smoke']
      },

      'P0204': {
        description: 'Injector 4 Circuit',
        severity: 'Medium',
        category: 'Fuel System',
        commonCauses: ['Faulty fuel injector', 'Wiring issues', 'ECM problems', 'Fuel rail issues'],
        symptoms: ['Rough idle', 'Misfiring', 'Poor fuel economy', 'Black smoke']
      },

      // EGR System Codes
      'P0400': {
        description: 'Exhaust Gas Recirculation Flow',
        severity: 'Medium',
        category: 'Emission System',
        commonCauses: ['Clogged EGR valve', 'Faulty EGR valve', 'Carbon buildup', 'Vacuum leak'],
        symptoms: ['Rough idle', 'Knocking', 'Failed emissions test', 'Stalling']
      },

      'P0401': {
        description: 'Exhaust Gas Recirculation Flow Insufficient',
        severity: 'Medium',
        category: 'Emission System',
        commonCauses: ['Clogged EGR passages', 'Faulty EGR valve', 'Carbon deposits', 'Vacuum issues'],
        symptoms: ['Knocking', 'Poor performance', 'Failed emissions test']
      },

      'P0402': {
        description: 'Exhaust Gas Recirculation Flow Excessive',
        severity: 'Medium',
        category: 'Emission System',
        commonCauses: ['Stuck open EGR valve', 'Faulty EGR position sensor', 'Vacuum leak'],
        symptoms: ['Rough idle', 'Stalling', 'Poor acceleration', 'Black smoke']
      },
    };
    
    const upperCode = code.toUpperCase();
    return codeMap[upperCode] || {
      description: 'Unbekannter Fehlercode',
      severity: 'Unbekannt',
      category: 'Allgemein',
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