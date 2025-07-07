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
      }
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

  // Zusätzliche Hilfsfunktion für Code-Validierung
  isValidCode: (code) => {
    const pattern = /^[PBCU][0-9]{4}$/i;
    return pattern.test(code);
  },

  // Code-Kategorien
  getCodeCategory: (code) => {
    const prefix = code.charAt(0).toUpperCase();
    const categories = {
      'P': 'Powertrain (Antriebsstrang)',
      'B': 'Body (Karosserie)',
      'C': 'Chassis (Fahrwerk)',
      'U': 'Network/User (Netzwerk)'
    };
    return categories[prefix] || 'Unbekannt';
  }
};

export default OBD2_DECODER;