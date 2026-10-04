const VIN_DECODER = {
  manufacturers: {
    // BMW
    'WBA': { make: 'BMW', country: 'Deutschland', type: 'PKW', plant: 'München/Dingolfing' },
    'WBS': { make: 'BMW', country: 'Deutschland', type: 'M-Serie/Sport', plant: 'München' },
    'WBY': { make: 'BMW', country: 'Deutschland', type: 'i-Serie/Elektro', plant: 'Leipzig' },
    '4US': { make: 'BMW', country: 'USA', type: 'BMW USA', plant: 'Spartanburg' },
    '5UX': { make: 'BMW', country: 'USA', type: 'SUV', plant: 'Spartanburg' },
    
    // Mercedes-Benz
    'WDB': { make: 'Mercedes-Benz', country: 'Deutschland', type: 'PKW', plant: 'Sindelfingen/Bremen' },
    'WDD': { make: 'Mercedes-Benz', country: 'Deutschland', type: 'PKW/Kompakt', plant: 'Rastatt/Kecskemét' },
    'WDC': { make: 'Mercedes-Benz', country: 'Deutschland', type: 'Sprinter/Nutzfahrzeug', plant: 'Düsseldorf' },
    'WDF': { make: 'Mercedes-Benz', country: 'Deutschland', type: 'Unimog/Spezial', plant: 'Wörth' },
    '4JG': { make: 'Mercedes-Benz', country: 'USA', type: 'SUV', plant: 'Tuscaloosa' },
    
    // Audi
    'WAU': { make: 'Audi', country: 'Deutschland', type: 'PKW', plant: 'Ingolstadt/Neckarsulm' },
    'WA1': { make: 'Audi', country: 'Deutschland', type: 'A-Klasse/Kompakt', plant: 'Ingolstadt' },
    'WAN': { make: 'Audi', country: 'Deutschland', type: 'e-tron/Elektro', plant: 'Brüssel' },
    
    // Volkswagen Group
    'WVW': { make: 'Volkswagen', country: 'Deutschland', type: 'PKW', plant: 'Wolfsburg/Emden' },
    'WV1': { make: 'Volkswagen', country: 'Deutschland', type: 'Nutzfahrzeug', plant: 'Hannover' },
    'WV2': { make: 'Volkswagen', country: 'Deutschland', type: 'Bus/Transporter', plant: 'Hannover' },
    '3VW': { make: 'Volkswagen', country: 'Mexiko', type: 'PKW', plant: 'Puebla' },
    
    // Porsche
    'WP0': { make: 'Porsche', country: 'Deutschland', type: 'Sportwagen', plant: 'Stuttgart-Zuffenhausen' },
    'WP1': { make: 'Porsche', country: 'Deutschland', type: 'SUV', plant: 'Leipzig' },
    
    // Existing other brands (preserved)
    'VSS': { make: 'SEAT', country: 'Spanien', type: 'PKW', plant: 'Martorell' },
    'TMB': { make: 'Škoda', country: 'Tschechien', type: 'PKW', plant: 'Mladá Boleslav' },
    'TRU': { make: 'Audi', country: 'Ungarn', type: 'PKW', plant: 'Győr' },
    'WME': { make: 'smart', country: 'Deutschland', type: 'Kleinwagen', plant: 'Hambach' },
    'VF1': { make: 'Renault', country: 'Frankreich', type: 'PKW', plant: 'Flins/Sandouville' },
    'VF3': { make: 'Peugeot', country: 'Frankreich', type: 'PKW', plant: 'Sochaux/Rennes' },
    
    'JTD': { make: 'Toyota', country: 'Japan', type: 'PKW', plant: 'Toyota City' },
    'JTE': { make: 'Toyota', country: 'Japan', type: 'SUV/Truck', plant: 'Tahara' },
    'JTH': { make: 'Toyota', country: 'Japan', type: 'Hybrid', plant: 'Tsutsumi' },
    'JTK': { make: 'Toyota', country: 'Japan', type: 'Lexus', plant: 'Motomachi' },
    '4T1': { make: 'Toyota', country: 'USA', type: 'PKW', plant: 'Georgetown' },
    '5TD': { make: 'Toyota', country: 'USA', type: 'Truck/SUV', plant: 'San Antonio' },
    
    'JHM': { make: 'Honda', country: 'Japan', type: 'PKW', plant: 'Marysville' },
    'JHL': { make: 'Honda', country: 'Japan', type: 'Acura', plant: 'East Liberty' },
    '1HG': { make: 'Honda', country: 'USA', type: 'Civic/Accord', plant: 'Marysville' },
    '2HG': { make: 'Honda', country: 'USA', type: 'Civic', plant: 'Greensburg' },
    '19X': { make: 'Honda', country: 'USA', type: 'Acura NSX', plant: 'Performance Mfg Center' },
    
    'JM1': { make: 'Mazda', country: 'Japan', type: 'PKW', plant: 'Hiroshima' },
    'JM3': { make: 'Mazda', country: 'Japan', type: 'SUV', plant: 'Hofu' },
    '3MZ': { make: 'Mazda', country: 'Mexico', type: 'PKW', plant: 'Salamanca' },
    
    'JF1': { make: 'Subaru', country: 'Japan', type: 'PKW', plant: 'Gunma' },
    'JF2': { make: 'Subaru', country: 'Japan', type: 'SUV', plant: 'Gunma' },
    '4S3': { make: 'Subaru', country: 'USA', type: 'Legacy/Outback', plant: 'Lafayette' },
    '4S4': { make: 'Subaru', country: 'USA', type: 'Ascent', plant: 'Lafayette' },
    
    'JN1': { make: 'Nissan', country: 'Japan', type: 'PKW', plant: 'Oppama' },
    'JN8': { make: 'Nissan', country: 'Japan', type: 'SUV', plant: 'Kyushu' },
    'JNK': { make: 'Nissan', country: 'Japan', type: 'Infiniti', plant: 'Tochigi' },
    '1N4': { make: 'Nissan', country: 'USA', type: 'Altima/Sentra', plant: 'Smyrna' },
    '1N6': { make: 'Nissan', country: 'USA', type: 'Titan', plant: 'Canton' },
    '5N1': { make: 'Nissan', country: 'USA', type: 'Pathfinder', plant: 'Smyrna' },
    
    'KMH': { make: 'Hyundai', country: 'Südkorea', type: 'PKW', plant: 'Ulsan/Asan' },
    'KMF': { make: 'Hyundai', country: 'Südkorea', type: 'SUV', plant: 'Ulsan' },
    'KMG': { make: 'Hyundai', country: 'Südkorea', type: 'Genesis', plant: 'Ulsan' },
    'KM8': { make: 'Hyundai', country: 'USA', type: 'Santa Fe', plant: 'Montgomery' },
    
    'KNA': { make: 'Kia', country: 'Südkorea', type: 'PKW', plant: 'Sohari/Hwaseong' },
    'KNE': { make: 'Kia', country: 'Südkorea', type: 'EV', plant: 'Hwaseong' },
    'KND': { make: 'Kia', country: 'USA', type: 'Sorento/Telluride', plant: 'West Point' },
    
    '1G1': { make: 'Chevrolet', country: 'USA', type: 'Camaro/Corvette', plant: 'Bowling Green' },
    '1G6': { make: 'Cadillac', country: 'USA', type: 'Luxury', plant: 'Lansing' },
    '1GM': { make: 'Chevrolet', country: 'USA', type: 'Truck/SUV', plant: 'Various' },
    '1GC': { make: 'Chevrolet', country: 'USA', type: 'Silverado', plant: 'Fort Wayne' },
    '3G1': { make: 'Chevrolet', country: 'Mexico', type: 'Aveo/Spark', plant: 'Ramos Arizpe' },
    
    '1FA': { make: 'Ford', country: 'USA', type: 'PKW', plant: 'Dearborn' },
    '1FT': { make: 'Ford', country: 'USA', type: 'F-Series', plant: 'Dearborn Truck' },
    '1FM': { make: 'Ford', country: 'USA', type: 'Explorer/Expedition', plant: 'Chicago' },
    '1LN': { make: 'Lincoln', country: 'USA', type: 'Luxury', plant: 'Flat Rock' },
    '3FA': { make: 'Ford', country: 'Mexico', type: 'Fiesta/Focus', plant: 'Cuautitlan' },
    
    '1C3': { make: 'Chrysler', country: 'USA', type: 'PKW', plant: 'Windsor' },
    '1C4': { make: 'Chrysler', country: 'USA', type: 'Jeep', plant: 'Toledo' },
    '1C6': { make: 'Chrysler', country: 'USA', type: 'Ram', plant: 'Warren Truck' },
    '2C3': { make: 'Chrysler', country: 'Canada', type: 'Challenger/Charger', plant: 'Brampton' },
    
    'VF7': { make: 'Citroën', country: 'Frankreich', type: 'PKW', plant: 'Rennes/Aulnay' },
    'VF8': { make: 'Citroën', country: 'Frankreich', type: 'Berlingo/Jumper', plant: 'Valenciennes' },
    
    'ZFA': { make: 'Fiat', country: 'Italien', type: 'PKW', plant: 'Pomigliano/Melfi' },
    'ZAR': { make: 'Alfa Romeo', country: 'Italien', type: 'PKW', plant: 'Cassino' },
    'ZAM': { make: 'Maserati', country: 'Italien', type: 'Luxury', plant: 'Modena' },
    'ZFF': { make: 'Ferrari', country: 'Italien', type: 'Supercar', plant: 'Maranello' },
    'ZLA': { make: 'Lamborghini', country: 'Italien', type: 'Supercar', plant: 'Sant\'Agata' },
    
    'YV1': { make: 'Volvo', country: 'Schweden', type: 'PKW', plant: 'Göteborg' },
    'YV4': { make: 'Volvo', country: 'Schweden', type: 'XC90', plant: 'Göteborg' },
    'LYV': { make: 'Volvo', country: 'China', type: 'PKW', plant: 'Luqiao' },
    
    'YS3': { make: 'Saab', country: 'Schweden', type: 'PKW', plant: 'Trollhättan' },
    
    'SJN': { make: 'Nissan', country: 'UK', type: 'PKW', plant: 'Sunderland' },
    'SAJ': { make: 'Jaguar', country: 'UK', type: 'Luxury', plant: 'Castle Bromwich' },
    'SAL': { make: 'Land Rover', country: 'UK', type: 'SUV', plant: 'Solihull' },
    'SCB': { make: 'Bentley', country: 'UK', type: 'Luxury', plant: 'Crewe' },
    'SCC': { make: 'Lotus', country: 'UK', type: 'Sports', plant: 'Hethel' },
    'SCE': { make: 'McLaren', country: 'UK', type: 'Supercar', plant: 'Woking' },
    
    'LGX': { make: 'BYD', country: 'China', type: 'EV', plant: 'Shenzhen' },
    'LGB': { make: 'Geely', country: 'China', type: 'PKW', plant: 'Hangzhou' },
    'LDC': { make: 'Chery', country: 'China', type: 'PKW', plant: 'Wuhu' },
    'LFV': { make: 'FAW', country: 'China', type: 'PKW', plant: 'Changchun' },
    'LSG': { make: 'SAIC', country: 'China', type: 'PKW', plant: 'Shanghai' },
    'LBV': { make: 'BMW', country: 'China', type: 'PKW', plant: 'Shenyang' },
    'LDY': { make: 'Mercedes-Benz', country: 'China', type: 'PKW', plant: 'Beijing' },
    'LFP': { make: 'Audi', country: 'China', type: 'PKW', plant: 'Changchun' },
    'LVG': { make: 'Volkswagen', country: 'China', type: 'PKW', plant: 'Shanghai' },
    'LTV': { make: 'Tesla', country: 'China', type: 'EV', plant: 'Shanghai' },
    
    'NLE': { make: 'Tesla', country: 'Netherlands', type: 'EV', plant: 'Tilburg' },
    '5YJ': { make: 'Tesla', country: 'USA', type: 'EV', plant: 'Fremont' },
    '7G2': { make: 'Tesla', country: 'USA', type: 'Model Y', plant: 'Austin' },
    
    'NM0': { make: 'Ford', country: 'Turkey', type: 'Transit', plant: 'Kocaeli' },
    'VNE': { make: 'Ford', country: 'Spain', type: 'Kuga/S-Max', plant: 'Valencia' },
    'WF0': { make: 'Ford', country: 'Deutschland', type: 'Fiesta/Focus', plant: 'Köln' },

    // Ergänzungen
    'W0L': { make: 'Opel', country: 'Deutschland', type: 'PKW', plant: 'Rüsselsheim/Eisenach' },
    'W0V': { make: 'Opel', country: 'Deutschland', type: 'PKW', plant: 'Rüsselsheim' },
    'WMW': { make: 'MINI', country: 'Deutschland', type: 'PKW', plant: 'Oxford/Born' },
    'WBX': { make: 'BMW', country: 'Deutschland', type: 'SUV', plant: 'Dingolfing' },
    'WUA': { make: 'Audi', country: 'Deutschland', type: 'quattro GmbH/RS', plant: 'Neckarsulm' },
    'WVG': { make: 'Volkswagen', country: 'Deutschland', type: 'SUV', plant: 'Osnabrück/Zwickau' },
    'WV3': { make: 'Volkswagen', country: 'Deutschland', type: 'Nutzfahrzeug', plant: 'Hannover' },
    'W1K': { make: 'Mercedes-Benz', country: 'Deutschland', type: 'PKW', plant: 'Sindelfingen' },
    'W1N': { make: 'Mercedes-Benz', country: 'Deutschland', type: 'SUV', plant: 'Bremen/Rastatt' },
    'W1V': { make: 'Mercedes-Benz', country: 'Deutschland', type: 'Transporter', plant: 'Düsseldorf/Ludwigsfelde' },
    'WDA': { make: 'Mercedes-Benz', country: 'Deutschland', type: 'Nutzfahrzeug', plant: 'Wörth' },
    'UU1': { make: 'Dacia', country: 'Rumänien', type: 'PKW', plant: 'Mioveni' },
    'VR1': { make: 'DS', country: 'Frankreich', type: 'PKW', plant: 'Poissy' },
    'VR3': { make: 'Peugeot', country: 'Frankreich', type: 'PKW', plant: 'Mulhouse/Sochaux' },
    'VR7': { make: 'Citroën', country: 'Frankreich', type: 'PKW', plant: 'Vigo/Mulhouse' },
    'TMA': { make: 'Hyundai', country: 'Tschechien', type: 'PKW', plant: 'Nošovice' },
    'U5Y': { make: 'Kia', country: 'Slowakei', type: 'PKW', plant: 'Žilina' },
    'VNK': { make: 'Toyota', country: 'Frankreich', type: 'PKW', plant: 'Valenciennes' },
    'SB1': { make: 'Toyota', country: 'UK', type: 'PKW', plant: 'Burnaston' },
    'JMB': { make: 'Mitsubishi', country: 'Japan', type: 'PKW', plant: 'Okazaki' },
    'JS2': { make: 'Suzuki', country: 'Japan', type: 'PKW', plant: 'Hamamatsu' },
    'TSM': { make: 'Suzuki', country: 'Ungarn', type: 'PKW', plant: 'Esztergom' }
  },


  // Jahrescodes (Position 10), ohne I, O, Q, U, Z und 0
  yearCodes: {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
    'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
    'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026, 'V': 2027,
    'W': 2028, 'X': 2029, 'Y': 2030, '1': 2031, '2': 2032, '3': 2033,
    '4': 2034, '5': 2035, '6': 2036, '7': 2037, '8': 2038, '9': 2039
  },

  // VIN bereinigen: Leerzeichen/Bindestriche entfernen, Großbuchstaben, O/I/Q sind nicht erlaubt
  cleanVIN: (vin) => (vin || '').toString().replace(/[\s-]/g, '').toUpperCase(),

  isVinFormat: (vin) => /^[A-HJ-NPR-Z0-9]{17}$/.test(vin),

  // Prüfziffer nach ISO 3779 / FMVSS 115 (Position 9)
  checkDigitValid: (vin) => {
    const values = {
      A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
      J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
      S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9
    };
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const c = vin[i];
      const v = /\d/.test(c) ? Number(c) : values[c];
      sum += v * weights[i];
    }
    const remainder = sum % 11;
    return vin[8] === (remainder === 10 ? 'X' : String(remainder));
  },

  // Nordamerika (WMI beginnt mit 1-5) schreibt die Prüfziffer verbindlich vor
  usesCheckDigit: (wmi) => /^[1-5]/.test(wmi),

  // Baujahr aus Position 10. Der Code wiederholt sich alle 30 Jahre; bei nordamerikanischen
  // Fahrzeugen entscheidet Position 7 (Buchstabe = ab 2010), sonst wird das jüngste
  // plausible Jahr gewählt. Außerhalb Nordamerikas ist die Angabe nur eine Schätzung.
  decodeYear: (vin, wmi) => {
    const code = vin.charAt(9);
    const base = VIN_DECODER.yearCodes[code];
    if (!base) return { modelYear: null, confidence: 'none' };

    const maxYear = new Date().getFullYear() + 1;
    const candidates = [base, base - 30].filter((y) => y <= maxYear);
    if (!candidates.length) return { modelYear: null, confidence: 'none' };

    if (VIN_DECODER.usesCheckDigit(wmi)) {
      const modern = /[A-Z]/.test(vin.charAt(6));
      const year = modern ? base : base - 30;
      return year <= maxYear ? { modelYear: year, confidence: 'high' } : { modelYear: null, confidence: 'none' };
    }
    return { modelYear: candidates[0], confidence: 'estimated' };
  },

  // Verbindet die lokale Auswertung mit Daten aus der Fahrzeugdatenbank (/api/vin).
  // Lokal erkannte Werte (Hersteller, Land) bleiben maßgeblich; die Datenbank liefert Modell und Motor.
  mergeRemote: (decoded, remote) => {
    if (!decoded || !decoded.isValid || !remote) return decoded;
    const year = { ...decoded.year };
    // Ein von der Datenbank bestätigtes Baujahr ersetzt die reine Schätzung nicht, ergänzt sie aber
    if (!year.modelYear && remote.modelYear) {
      year.modelYear = remote.modelYear;
      year.age = Math.max(0, new Date().getFullYear() - remote.modelYear);
      year.confidence = 'estimated';
    }
    return {
      ...decoded,
      model: remote.model || decoded.model,
      engine: remote.engine || decoded.engine,
      year,
      body: { bodyClass: remote.bodyClass, driveType: remote.driveType, transmission: remote.transmission },
      dataSource: remote.source
    };
  },

  // Hauptfunktion. Liefert nur, was die VIN wirklich hergibt (Hersteller, Land, Baujahr);
  // Modell und Motor lassen sich aus der VIN ohne Herstellerdatenbank nicht ermitteln (null).
  decodeVIN: function (vin) {
    if (!vin) return null;

    const cleanVIN = VIN_DECODER.cleanVIN(vin);

    if (cleanVIN.length !== 17) {
      return { isValid: false, error: 'Die VIN muss genau 17 Zeichen haben' };
    }
    if (!VIN_DECODER.isVinFormat(cleanVIN)) {
      return { isValid: false, error: 'Die VIN enthält ungültige Zeichen (I, O und Q sind nicht erlaubt)' };
    }

    const wmi = cleanVIN.substring(0, 3);
    const manufacturer = VIN_DECODER.manufacturers[wmi];
    if (!manufacturer) {
      return { isValid: false, error: `Unbekannter Herstellercode: ${wmi}` };
    }

    const checkRequired = VIN_DECODER.usesCheckDigit(wmi);
    const checkOk = VIN_DECODER.checkDigitValid(cleanVIN);
    if (checkRequired && !checkOk) {
      return { isValid: false, error: 'Prüfziffer (Stelle 9) stimmt nicht – bitte VIN auf Tippfehler prüfen' };
    }

    const { modelYear, confidence } = VIN_DECODER.decodeYear(cleanVIN, wmi);
    const age = modelYear ? Math.max(0, new Date().getFullYear() - modelYear) : null;

    return {
      isValid: true,
      vin: cleanVIN,
      manufacturer: {
        name: manufacturer.make,
        country: manufacturer.country,
        type: manufacturer.type,
        plant: manufacturer.plant
      },
      model: { series: null },
      engine: null,
      year: {
        modelYear,
        yearCode: cleanVIN.charAt(9),
        age,
        confidence
      },
      checkDigit: { checked: checkRequired, valid: checkRequired ? true : null },
      vinStructure: {
        wmi,
        vds: cleanVIN.substring(3, 9),
        vis: cleanVIN.substring(9)
      },
      market: {
        primaryMarket: manufacturer.country === 'Deutschland' ? 'Europäische Union' : manufacturer.country
      }
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VIN_DECODER;
}
