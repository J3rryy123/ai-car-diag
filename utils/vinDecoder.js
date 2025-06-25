// VIN Decoder

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
    'WA1': { make: 'Audi', country: 'Deutschland', type: 'Kompakt', plant: 'Ingolstadt' },
    'WAN': { make: 'Audi', country: 'Deutschland', type: 'e-tron/Elektro', plant: 'Brüssel' },
    
    // Volkswagen Group
    'WVW': { make: 'Volkswagen', country: 'Deutschland', type: 'PKW', plant: 'Wolfsburg/Emden' },
    'WV1': { make: 'Volkswagen', country: 'Deutschland', type: 'Nutzfahrzeug', plant: 'Hannover' },
    'WV2': { make: 'Volkswagen', country: 'Deutschland', type: 'Bus/Transporter', plant: 'Hannover' },
    '3VW': { make: 'Volkswagen', country: 'Mexiko', type: 'PKW', plant: 'Puebla' },
    '9BW': { make: 'Volkswagen', country: 'Brasilien', type: 'PKW', plant: 'São Bernardo' },
    
    // Porsche
    'WP0': { make: 'Porsche', country: 'Deutschland', type: 'Sportwagen', plant: 'Stuttgart-Zuffenhausen' },
    'WP1': { make: 'Porsche', country: 'Deutschland', type: 'SUV', plant: 'Leipzig' },
    
    // Weitere Deutsche Hersteller
    'VSS': { make: 'SEAT', country: 'Spanien', type: 'PKW', plant: 'Martorell' },
    'TMB': { make: 'Škoda', country: 'Tschechien', type: 'PKW', plant: 'Mladá Boleslav' },
    'TRU': { make: 'Škoda', country: 'Tschechien', type: 'SUV', plant: 'Kvasiny' },
    'WME': { make: 'smart', country: 'Deutschland', type: 'Kleinwagen', plant: 'Hambach' },
    
    // Weitere internationale Hersteller
    'VF3': { make: 'Peugeot', country: 'Frankreich', type: 'PKW', plant: 'Sochaux/Mulhouse' },
    'VF7': { make: 'Citroën', country: 'Frankreich', type: 'PKW', plant: 'Rennes/Aulnay' },
    'VF1': { make: 'Renault', country: 'Frankreich', type: 'PKW', plant: 'Flins/Sandouville' },
    'ZFA': { make: 'Fiat', country: 'Italien', type: 'PKW', plant: 'Turin/Melfi' },
    'ZFF': { make: 'Ferrari', country: 'Italien', type: 'Sportwagen', plant: 'Maranello' },
    'YV1': { make: 'Volvo', country: 'Schweden', type: 'PKW', plant: 'Göteborg/Gent' },
    'JHM': { make: 'Honda', country: 'Japan', type: 'PKW', plant: 'Suzuka/Kumamoto' },
    'JTD': { make: 'Toyota', country: 'Japan', type: 'PKW', plant: 'Toyota City' },
    'KMH': { make: 'Hyundai', country: 'Südkorea', type: 'PKW', plant: 'Ulsan/Asan' },
    'KNA': { make: 'Kia', country: 'Südkorea', type: 'PKW', plant: 'Sohari/Hwaseong' }
  },

  // Jahrescodes mit Dekaden-Logik
  yearCodes: {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
    'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
    'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026, 'V': 2027,
    'W': 2028, 'X': 2029, 'Y': 2030, '1': 2001, '2': 2002, '3': 2003,
    '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009
  },

  validateVIN: (vin) => {
    if (!vin) return false;
    const cleanVIN = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase();
    return cleanVIN.length === 17;
  },

  // Hauptfunktion - Vereinfachte VIN-Dekodierung
  decodeVIN: (vin) => {
    if (!vin) return null;
    
    const cleanVIN = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase();
    
    if (cleanVIN.length !== 17) {
      return { isValid: false, error: 'VIN muss genau 17 Zeichen haben' };
    }
    
    // VIN-Segmente
    const wmi = cleanVIN.substring(0, 3);
    const vds = cleanVIN.substring(3, 9);
    const yearCode = cleanVIN.charAt(9);
    const plantCode = cleanVIN.charAt(10);
    const serialNumber = cleanVIN.substring(11);
    
    // Hersteller-Information
    const manufacturer = SIMPLIFIED_VIN_DECODER.manufacturers[wmi];
    const year = SIMPLIFIED_VIN_DECODER.yearCodes[yearCode];
    const vehicleAge = year ? new Date().getFullYear() - year : null;
    
    // Assembly Plant Information
    const getPlantInfo = () => {
      const plantMappings = {
        'WBA': {
          '0': 'München Werk 1', '1': 'München Werk 2', '2': 'Dingolfing', 
          '3': 'Berlin', '4': 'Regensburg', '5': 'Leipzig'
        },
        'WDD': {
          '0': 'Sindelfingen', '1': 'Bremen', '2': 'Rastatt', 
          '3': 'Hamburg', '4': 'Düsseldorf', '5': 'Kecskemét'
        }
      };
      return plantMappings[wmi]?.[plantCode] || `Werk Code: ${plantCode}`;
    };

    // Grundlegende technische Spezifikationen
    const getBasicSpecs = () => {
      const specs = {
        emissionStandard: year >= 2017 ? 'Euro 6d-TEMP/6d' : year >= 2014 ? 'Euro 6' : year >= 2009 ? 'Euro 5' : 'Euro 4',
        registrationRequired: vehicleAge && vehicleAge >= 3,
        nextInspection: vehicleAge && vehicleAge >= 3 ? 'TÜV/AU alle 2 Jahre' : 'Erstmalig nach 3 Jahren'
      };

      return specs;
    };

    return {
      vin: cleanVIN,
      isValid: true,
      segments: { wmi, vds, yearCode, plantCode, serialNumber },
      
      // Grunddaten
      make: manufacturer?.make || 'Unbekannt',
      country: manufacturer?.country || 'Unbekannt',
      vehicleType: manufacturer?.type || 'Unbekannt',
      
      // Jahr und Alter
      year: year || 'Unbekannt',
      vehicleAge: vehicleAge,
      isClassic: vehicleAge && vehicleAge > 30,
      isModern: vehicleAge && vehicleAge < 3,
      
      // Produktion
      assemblyPlant: getPlantInfo(),
      serialNumber: serialNumber,
      
      // Grundlegende technische Daten
      estimatedSpecs: getBasicSpecs(),
    };
  }
};

export default VIN_DECODER;