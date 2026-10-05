const VIN_DECODER = {
  // Herstellercodes (WMI, Stellen 1–3). Nur Einträge, die sicher zugeordnet sind; Land = Land des Herstellercodes (Werk bzw. Hersteller)
  manufacturers: {
    // --- Deutschland
    'WBA': { make: 'BMW', country: 'Deutschland' },
    'WBS': { make: 'BMW', country: 'Deutschland' },
    'WBY': { make: 'BMW', country: 'Deutschland' },
    'WBX': { make: 'BMW', country: 'Deutschland' },
    'WB1': { make: 'BMW', country: 'Deutschland' },
    'WMW': { make: 'MINI', country: 'Deutschland' },
    'WDA': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'WDB': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'WDC': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'WDD': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'WDF': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'WD3': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'WD4': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'W1K': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'W1N': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'W1V': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'W1Y': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'WME': { make: 'smart', country: 'Deutschland' },
    'WAU': { make: 'Audi', country: 'Deutschland' },
    'WA1': { make: 'Audi', country: 'Deutschland' },
    'WUA': { make: 'Audi', country: 'Deutschland' },
    'WVW': { make: 'Volkswagen', country: 'Deutschland' },
    'WV1': { make: 'Volkswagen', country: 'Deutschland' },
    'WV2': { make: 'Volkswagen', country: 'Deutschland' },
    'WV3': { make: 'Volkswagen', country: 'Deutschland' },
    'WVG': { make: 'Volkswagen', country: 'Deutschland' },
    'WP0': { make: 'Porsche', country: 'Deutschland' },
    'WP1': { make: 'Porsche', country: 'Deutschland' },
    'W0L': { make: 'Opel', country: 'Deutschland' },
    'W0V': { make: 'Opel', country: 'Deutschland' },
    'WF0': { make: 'Ford', country: 'Deutschland' },
    'WMA': { make: 'MAN', country: 'Deutschland' },
    'WJM': { make: 'Iveco Magirus', country: 'Deutschland' },

    // --- Mitteleuropa
    'TMB': { make: 'Škoda', country: 'Tschechien' },
    'TMA': { make: 'Hyundai', country: 'Tschechien' },
    'TRU': { make: 'Audi', country: 'Ungarn' },
    'TSM': { make: 'Suzuki', country: 'Ungarn' },
    'U5Y': { make: 'Kia', country: 'Slowakei' },
    'UU1': { make: 'Dacia', country: 'Rumänien' },

    // --- Frankreich
    'VF1': { make: 'Renault', country: 'Frankreich' },
    'VF3': { make: 'Peugeot', country: 'Frankreich' },
    'VR3': { make: 'Peugeot', country: 'Frankreich' },
    'VF7': { make: 'Citroën', country: 'Frankreich' },
    'VR7': { make: 'Citroën', country: 'Frankreich' },
    'VR1': { make: 'DS', country: 'Frankreich' },
    'VF9': { make: 'Bugatti', country: 'Frankreich' },
    'VF6': { make: 'Renault Trucks', country: 'Frankreich' },
    'VNK': { make: 'Toyota', country: 'Frankreich' },

    // --- Spanien
    'VSS': { make: 'SEAT', country: 'Spanien' },
    'VSK': { make: 'Nissan', country: 'Spanien' },
    'VS6': { make: 'Ford', country: 'Spanien' },

    // --- Italien
    'ZFA': { make: 'Fiat', country: 'Italien' },
    'ZFC': { make: 'Fiat', country: 'Italien' },
    'ZCF': { make: 'Iveco', country: 'Italien' },
    'ZAR': { make: 'Alfa Romeo', country: 'Italien' },
    'ZAM': { make: 'Maserati', country: 'Italien' },
    'ZFF': { make: 'Ferrari', country: 'Italien' },
    'ZLA': { make: 'Lancia', country: 'Italien' },
    'ZHW': { make: 'Lamborghini', country: 'Italien' },
    'ZAP': { make: 'Piaggio', country: 'Italien' },
    'ZDM': { make: 'Ducati', country: 'Italien' },

    // --- Nordeuropa / Benelux
    'YV1': { make: 'Volvo', country: 'Schweden' },
    'YV4': { make: 'Volvo', country: 'Schweden' },
    'YV2': { make: 'Volvo', country: 'Schweden' },
    'YS2': { make: 'Scania', country: 'Schweden' },
    'YS3': { make: 'Saab', country: 'Schweden' },
    'XLR': { make: 'DAF', country: 'Niederlande' },

    // --- Großbritannien
    'SAJ': { make: 'Jaguar', country: 'Großbritannien' },
    'SAL': { make: 'Land Rover', country: 'Großbritannien' },
    'SCB': { make: 'Bentley', country: 'Großbritannien' },
    'SCC': { make: 'Lotus', country: 'Großbritannien' },
    'SCF': { make: 'Aston Martin', country: 'Großbritannien' },
    'SBM': { make: 'McLaren', country: 'Großbritannien' },
    'SCA': { make: 'Rolls-Royce', country: 'Großbritannien' },
    'SJN': { make: 'Nissan', country: 'Großbritannien' },
    'SB1': { make: 'Toyota', country: 'Großbritannien' },
    'SHH': { make: 'Honda', country: 'Großbritannien' },

    // --- Russland / Türkei
    'XTA': { make: 'Lada', country: 'Russland' },
    'XTT': { make: 'UAZ', country: 'Russland' },
    'NM0': { make: 'Ford', country: 'Türkei' },
    'NMT': { make: 'Toyota', country: 'Türkei' },
    'NLH': { make: 'Hyundai', country: 'Türkei' },

    // --- Japan
    'JTD': { make: 'Toyota', country: 'Japan' },
    'JTE': { make: 'Toyota', country: 'Japan' },
    'JT2': { make: 'Toyota', country: 'Japan' },
    'JTM': { make: 'Toyota', country: 'Japan' },
    'JTN': { make: 'Toyota', country: 'Japan' },
    'JTH': { make: 'Lexus', country: 'Japan' },
    'JTJ': { make: 'Lexus', country: 'Japan' },
    'JHM': { make: 'Honda', country: 'Japan' },
    'JHL': { make: 'Honda', country: 'Japan' },
    'JH2': { make: 'Honda', country: 'Japan' },
    'JH4': { make: 'Acura', country: 'Japan' },
    'JN1': { make: 'Nissan', country: 'Japan' },
    'JN8': { make: 'Nissan', country: 'Japan' },
    'JNK': { make: 'Infiniti', country: 'Japan' },
    'JM1': { make: 'Mazda', country: 'Japan' },
    'JM3': { make: 'Mazda', country: 'Japan' },
    'JMZ': { make: 'Mazda', country: 'Japan' },
    'JF1': { make: 'Subaru', country: 'Japan' },
    'JF2': { make: 'Subaru', country: 'Japan' },
    'JMB': { make: 'Mitsubishi', country: 'Japan' },
    'JA3': { make: 'Mitsubishi', country: 'Japan' },
    'JA4': { make: 'Mitsubishi', country: 'Japan' },
    'JS2': { make: 'Suzuki', country: 'Japan' },
    'JS3': { make: 'Suzuki', country: 'Japan' },
    'JAA': { make: 'Isuzu', country: 'Japan' },
    'JDA': { make: 'Daihatsu', country: 'Japan' },
    'JKA': { make: 'Kawasaki', country: 'Japan' },
    'JYA': { make: 'Yamaha', country: 'Japan' },

    // --- Südkorea
    'KMH': { make: 'Hyundai', country: 'Südkorea' },
    'KMF': { make: 'Hyundai', country: 'Südkorea' },
    'KM8': { make: 'Hyundai', country: 'Südkorea' },
    'KMT': { make: 'Genesis', country: 'Südkorea' },
    'KNA': { make: 'Kia', country: 'Südkorea' },
    'KNC': { make: 'Kia', country: 'Südkorea' },
    'KND': { make: 'Kia', country: 'Südkorea' },
    'KNE': { make: 'Kia', country: 'Südkorea' },
    'KL1': { make: 'Chevrolet', country: 'Südkorea' },
    'KLA': { make: 'Daewoo', country: 'Südkorea' },
    'KPT': { make: 'SsangYong', country: 'Südkorea' },
    'KNM': { make: 'Renault Samsung', country: 'Südkorea' },

    // --- USA
    '1FA': { make: 'Ford', country: 'USA' },
    '1FT': { make: 'Ford', country: 'USA' },
    '1FM': { make: 'Ford', country: 'USA' },
    '1FD': { make: 'Ford', country: 'USA' },
    '1FB': { make: 'Ford', country: 'USA' },
    '1FC': { make: 'Ford', country: 'USA' },
    '1LN': { make: 'Lincoln', country: 'USA' },
    '5LM': { make: 'Lincoln', country: 'USA' },
    '1G1': { make: 'Chevrolet', country: 'USA' },
    '1GC': { make: 'Chevrolet', country: 'USA' },
    '1GN': { make: 'Chevrolet', country: 'USA' },
    '1GT': { make: 'GMC', country: 'USA' },
    '1GK': { make: 'GMC', country: 'USA' },
    '1G4': { make: 'Buick', country: 'USA' },
    '1G6': { make: 'Cadillac', country: 'USA' },
    '1C3': { make: 'Chrysler', country: 'USA' },
    '1C4': { make: 'Jeep', country: 'USA' },
    '1J4': { make: 'Jeep', country: 'USA' },
    '1J8': { make: 'Jeep', country: 'USA' },
    '1C6': { make: 'Ram', country: 'USA' },
    '1B3': { make: 'Dodge', country: 'USA' },
    '5YJ': { make: 'Tesla', country: 'USA' },
    '7SA': { make: 'Tesla', country: 'USA' },
    '7G2': { make: 'Tesla', country: 'USA' },
    '1HG': { make: 'Honda', country: 'USA' },
    '5J6': { make: 'Honda', country: 'USA' },
    '5FN': { make: 'Honda', country: 'USA' },
    '19X': { make: 'Acura', country: 'USA' },
    '4T1': { make: 'Toyota', country: 'USA' },
    '4T3': { make: 'Toyota', country: 'USA' },
    '5TD': { make: 'Toyota', country: 'USA' },
    '5TF': { make: 'Toyota', country: 'USA' },
    '1N4': { make: 'Nissan', country: 'USA' },
    '1N6': { make: 'Nissan', country: 'USA' },
    '5N1': { make: 'Nissan', country: 'USA' },
    '4S3': { make: 'Subaru', country: 'USA' },
    '4S4': { make: 'Subaru', country: 'USA' },
    '5NP': { make: 'Hyundai', country: 'USA' },
    '5NM': { make: 'Hyundai', country: 'USA' },
    '5XY': { make: 'Kia', country: 'USA' },
    '5XX': { make: 'Kia', country: 'USA' },
    '4US': { make: 'BMW', country: 'USA' },
    '5UX': { make: 'BMW', country: 'USA' },
    '5YM': { make: 'BMW', country: 'USA' },
    '4JG': { make: 'Mercedes-Benz', country: 'USA' },
    '1VW': { make: 'Volkswagen', country: 'USA' },
    '7JR': { make: 'Volvo', country: 'USA' },
    '50E': { make: 'Lucid', country: 'USA' },
    '7FC': { make: 'Rivian', country: 'USA' },

    // --- Kanada / Mexiko
    '2FA': { make: 'Ford', country: 'Kanada' },
    '2G1': { make: 'Chevrolet', country: 'Kanada' },
    '2C3': { make: 'Chrysler', country: 'Kanada' },
    '2B3': { make: 'Dodge', country: 'Kanada' },
    '2HG': { make: 'Honda', country: 'Kanada' },
    '3FA': { make: 'Ford', country: 'Mexiko' },
    '3G1': { make: 'Chevrolet', country: 'Mexiko' },
    '3N1': { make: 'Nissan', country: 'Mexiko' },
    '3MZ': { make: 'Mazda', country: 'Mexiko' },
    '3VW': { make: 'Volkswagen', country: 'Mexiko' },
    '3C6': { make: 'Ram', country: 'Mexiko' },
    '3C7': { make: 'Ram', country: 'Mexiko' },

    // --- China
    'LGX': { make: 'BYD', country: 'China' },
    'LC0': { make: 'BYD', country: 'China' },
    'L6T': { make: 'Geely', country: 'China' },
    'LVV': { make: 'Chery', country: 'China' },
    'LGW': { make: 'Great Wall', country: 'China' },
    'LSJ': { make: 'MG', country: 'China' },
    'LSV': { make: 'Volkswagen', country: 'China' },
    'LFV': { make: 'Volkswagen', country: 'China' },
    'LSG': { make: 'SAIC-GM', country: 'China' },
    'LBV': { make: 'BMW', country: 'China' },
    'LE4': { make: 'Mercedes-Benz', country: 'China' },
    'LRW': { make: 'Tesla', country: 'China' },
    'LTV': { make: 'Toyota', country: 'China' },
    'LYV': { make: 'Volvo', country: 'China' },
    'LDC': { make: 'Peugeot Citroën', country: 'China' },
    'LS5': { make: 'Changan', country: 'China' },
    'LVS': { make: 'Ford', country: 'China' },

    // --- Indien / Südostasien / Südamerika
    'MA3': { make: 'Maruti Suzuki', country: 'Indien' },
    'MA1': { make: 'Mahindra', country: 'Indien' },
    'MAT': { make: 'Tata', country: 'Indien' },
    'MAL': { make: 'Hyundai', country: 'Indien' },
    'MAJ': { make: 'Ford', country: 'Indien' },
    'MR0': { make: 'Toyota', country: 'Thailand' },
    'MRH': { make: 'Honda', country: 'Thailand' },
    'MMB': { make: 'Mitsubishi', country: 'Thailand' },
    '9BW': { make: 'Volkswagen', country: 'Brasilien' },
    '9BG': { make: 'Chevrolet', country: 'Brasilien' },
    '9BD': { make: 'Fiat', country: 'Brasilien' },
    '9BF': { make: 'Ford', country: 'Brasilien' }
  },

  // Beginn des Herstellercodes (2 Stellen), wenn der genaue Code fehlt – nur dort, wo alle bekannten Codes zum selben Hersteller gehören
  makePrefixes: {
    'WB': { make: 'BMW', country: 'Deutschland' },
    'WP': { make: 'Porsche', country: 'Deutschland' },
    'WA': { make: 'Audi', country: 'Deutschland' },
    'WD': { make: 'Mercedes-Benz', country: 'Deutschland' },
    'WV': { make: 'Volkswagen', country: 'Deutschland' },
    'W0': { make: 'Opel', country: 'Deutschland' },
    'WF': { make: 'Ford', country: 'Deutschland' },
    'YV': { make: 'Volvo', country: 'Schweden' },
    'JS': { make: 'Suzuki', country: 'Japan' },
    'JF': { make: 'Subaru', country: 'Japan' },
    'JN': { make: 'Nissan', country: 'Japan' },
    'JH': { make: 'Honda', country: 'Japan' },
    'JT': { make: 'Toyota', country: 'Japan' }
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
    // Ist der Hersteller lokal unbekannt, kommt er aus der Fahrzeugdatenbank
    const manufacturer = decoded.manufacturer?.name || !remote.make
      ? decoded.manufacturer
      : { ...decoded.manufacturer, name: remote.make, matchedBy: 'database' };
    return {
      ...decoded,
      manufacturer,
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
    // Genauer Herstellercode, sonst Zuordnung nach den ersten 2 Stellen; sonst bleibt der Hersteller offen
    // (die VIN ist trotzdem gültig und kann über die Fahrzeugdatenbank ergänzt werden)
    const exact = VIN_DECODER.manufacturers[wmi];
    const byPrefix = exact ? null : VIN_DECODER.makePrefixes[wmi.slice(0, 2)];
    const manufacturer = exact || byPrefix || null;

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
        name: manufacturer?.make ?? null,
        country: manufacturer?.country ?? null,
        wmi,
        matchedBy: exact ? 'wmi' : byPrefix ? 'prefix' : null
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
        primaryMarket: manufacturer?.country === 'Deutschland' ? 'Europäische Union' : manufacturer?.country ?? null
      }
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VIN_DECODER;
}
