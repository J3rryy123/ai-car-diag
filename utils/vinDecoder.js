const VIN_DECODER = {
  manufacturers: {
    // BMW (existing entries preserved)
    'WBA': { make: 'BMW', country: 'Deutschland', type: 'PKW', plant: 'München/Dingolfing' },
    'WBS': { make: 'BMW', country: 'Deutschland', type: 'M-Serie/Sport', plant: 'München' },
    'WBY': { make: 'BMW', country: 'Deutschland', type: 'i-Serie/Elektro', plant: 'Leipzig' },
    '4US': { make: 'BMW', country: 'USA', type: 'BMW USA', plant: 'Spartanburg' },
    '5UX': { make: 'BMW', country: 'USA', type: 'SUV', plant: 'Spartanburg' },
    
    // Mercedes-Benz (existing entries preserved)
    'WDB': { make: 'Mercedes-Benz', country: 'Deutschland', type: 'PKW', plant: 'Sindelfingen/Bremen' },
    'WDD': { make: 'Mercedes-Benz', country: 'Deutschland', type: 'PKW/Kompakt', plant: 'Rastatt/Kecskemét' },
    'WDC': { make: 'Mercedes-Benz', country: 'Deutschland', type: 'Sprinter/Nutzfahrzeug', plant: 'Düsseldorf' },
    'WDF': { make: 'Mercedes-Benz', country: 'Deutschland', type: 'Unimog/Spezial', plant: 'Wörth' },
    '4JG': { make: 'Mercedes-Benz', country: 'USA', type: 'SUV', plant: 'Tuscaloosa' },
    
    // Audi (existing entries preserved)
    'WAU': { make: 'Audi', country: 'Deutschland', type: 'PKW', plant: 'Ingolstadt/Neckarsulm' },
    'WA1': { make: 'Audi', country: 'Deutschland', type: 'A-Klasse/Kompakt', plant: 'Ingolstadt' },
    'WAN': { make: 'Audi', country: 'Deutschland', type: 'e-tron/Elektro', plant: 'Brüssel' },
    
    // Volkswagen Group (existing entries preserved)
    'WVW': { make: 'Volkswagen', country: 'Deutschland', type: 'PKW', plant: 'Wolfsburg/Emden' },
    'WV1': { make: 'Volkswagen', country: 'Deutschland', type: 'Nutzfahrzeug', plant: 'Hannover' },
    'WV2': { make: 'Volkswagen', country: 'Deutschland', type: 'Bus/Transporter', plant: 'Hannover' },
    '3VW': { make: 'Volkswagen', country: 'Mexiko', type: 'PKW', plant: 'Puebla' },
    
    // Porsche (existing entries preserved)
    'WP0': { make: 'Porsche', country: 'Deutschland', type: 'Sportwagen', plant: 'Stuttgart-Zuffenhausen' },
    'WP1': { make: 'Porsche', country: 'Deutschland', type: 'SUV', plant: 'Leipzig' },
    
    // Existing other brands (preserved)
    'VSS': { make: 'SEAT', country: 'Spanien', type: 'PKW', plant: 'Martorell' },
    'TMB': { make: 'Škoda', country: 'Tschechien', type: 'PKW', plant: 'Mladá Boleslav' },
    'TRU': { make: 'Škoda', country: 'Tschechien', type: 'SUV', plant: 'Kvasiny' },
    'WME': { make: 'smart', country: 'Deutschland', type: 'Kleinwagen', plant: 'Hambach' },
    'VF1': { make: 'Renault', country: 'Frankreich', type: 'PKW', plant: 'Flins/Sandouville' },
    'VF3': { make: 'Peugeot', country: 'Frankreich', type: 'PKW', plant: 'Sochaux/Rennes' },
    
    // NEW ADDITIONS - Japanese Manufacturers
    'JTD': { make: 'Toyota', country: 'Japan', type: 'PKW', plant: 'Toyota City' },
    'JTE': { make: 'Toyota', country: 'Japan', type: 'SUV/Truck', plant: 'Tahara' },
    'JTH': { make: 'Toyota', country: 'Japan', type: 'Hybrid', plant: 'Tsutsumi' },
    'JTK': { make: 'Toyota', country: 'Japan', type: 'Lexus', plant: 'Motomachi' },
    '4T1': { make: 'Toyota', country: 'USA', type: 'PKW', plant: 'Georgetown' },
    '5TD': { make: 'Toyota', country: 'USA', type: 'Truck/SUV', plant: 'San Antonio' },
    
    'JHM': { make: 'Honda', country: 'USA', type: 'PKW', plant: 'Marysville' },
    'JHL': { make: 'Honda', country: 'USA', type: 'Acura', plant: 'East Liberty' },
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
    
    // NEW ADDITIONS - Korean Manufacturers
    'KMH': { make: 'Hyundai', country: 'Südkorea', type: 'PKW', plant: 'Ulsan/Asan' },
    'KMF': { make: 'Hyundai', country: 'Südkorea', type: 'SUV', plant: 'Ulsan' },
    'KMG': { make: 'Hyundai', country: 'Südkorea', type: 'Genesis', plant: 'Ulsan' },
    'KM8': { make: 'Hyundai', country: 'USA', type: 'Santa Fe', plant: 'Montgomery' },
    
    'KNA': { make: 'Kia', country: 'Südkorea', type: 'PKW', plant: 'Sohari/Hwaseong' },
    'KNE': { make: 'Kia', country: 'Südkorea', type: 'EV', plant: 'Hwaseong' },
    'KND': { make: 'Kia', country: 'USA', type: 'Sorento/Telluride', plant: 'West Point' },
    
    // NEW ADDITIONS - American Manufacturers
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
    
    // NEW ADDITIONS - European Manufacturers
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
    
    // NEW ADDITIONS - Chinese Manufacturers
    'LVS': { make: 'BYD', country: 'China', type: 'EV', plant: 'Shenzhen' },
    'LGB': { make: 'Geely', country: 'China', type: 'PKW', plant: 'Hangzhou' },
    'LDC': { make: 'Chery', country: 'China', type: 'PKW', plant: 'Wuhu' },
    'LFV': { make: 'FAW', country: 'China', type: 'PKW', plant: 'Changchun' },
    'LSG': { make: 'SAIC', country: 'China', type: 'PKW', plant: 'Shanghai' },
    'LBV': { make: 'BMW', country: 'China', type: 'PKW', plant: 'Shenyang' },
    'LDY': { make: 'Mercedes-Benz', country: 'China', type: 'PKW', plant: 'Beijing' },
    'LFP': { make: 'Audi', country: 'China', type: 'PKW', plant: 'Changchun' },
    'LVG': { make: 'Volkswagen', country: 'China', type: 'PKW', plant: 'Shanghai' },
    'LTV': { make: 'Tesla', country: 'China', type: 'EV', plant: 'Shanghai' },
    
    // NEW ADDITIONS - Other Global Manufacturers
    'NLE': { make: 'Tesla', country: 'Netherlands', type: 'EV', plant: 'Tilburg' },
    '5YJ': { make: 'Tesla', country: 'USA', type: 'EV', plant: 'Fremont' },
    '7G2': { make: 'Tesla', country: 'USA', type: 'Model Y', plant: 'Austin' },
    
    'NM0': { make: 'Ford', country: 'Turkey', type: 'Transit', plant: 'Kocaeli' },
    'VNE': { make: 'Ford', country: 'Spain', type: 'Kuga/S-Max', plant: 'Valencia' },
    'WF0': { make: 'Ford', country: 'Deutschland', type: 'Fiesta/Focus', plant: 'Köln' }
  },

  // Engine codes organized by manufacturer (existing entries preserved, new ones added)
  engineCodes: {
    // BMW (existing entries preserved)
    'BMW': {
      'N20': { engine: 'TwinPower Turbo 2.0L', displacement: '2.0L', fuel: 'Benzin', power: '184-245 PS', cylinders: 4, turbo: true, config: 'Inline-4 Twin-Scroll Turbo' },
      'N55': { engine: 'TwinPower Turbo 3.0L', displacement: '3.0L', fuel: 'Benzin', power: '306 PS', cylinders: 6, turbo: true, config: 'Inline-6 Single Turbo' },
      'S55': { engine: 'M TwinPower Turbo 3.0L', displacement: '3.0L', fuel: 'Benzin', power: '431-450 PS', cylinders: 6, turbo: true, config: 'M Performance Inline-6 Twin-Turbo' },
      'B58': { engine: 'TwinPower Turbo 3.0L', displacement: '3.0L', fuel: 'Benzin', power: '340-387 PS', cylinders: 6, turbo: true, config: 'Modular Inline-6 Single Twin-Scroll Turbo' },
      'N63': { engine: 'TwinPower Turbo V8', displacement: '4.4L', fuel: 'Benzin', power: '407-530 PS', cylinders: 8, turbo: true, config: 'V8 Twin-Turbo Hot-V' }
    },

    // Mercedes-Benz (existing entries preserved)
    'Mercedes-Benz': {
      'M274': { engine: 'CGI Turbo', displacement: '2.0L', fuel: 'Benzin', power: '156-211 PS', cylinders: 4, turbo: true, config: 'Inline-4 Direct Injection Turbo' },
      'M276': { engine: 'CGI V6', displacement: '3.0L', fuel: 'Benzin', power: '333-367 PS', cylinders: 6, turbo: false, config: 'V6 Direct Injection' },
      'M177': { engine: 'AMG V8 Biturbo', displacement: '4.0L', fuel: 'Benzin', power: '476-630 PS', cylinders: 8, turbo: true, config: 'V8 Twin-Turbo AMG' },
      'OM654': { engine: 'BlueTEC Diesel', displacement: '2.0L', fuel: 'Diesel', power: '150-245 PS', cylinders: 4, turbo: true, config: 'Inline-4 Diesel Turbo BlueTEC' }
    },

    // Audi (existing entries preserved)
    'Audi': {
      'EA888': { engine: 'TFSI Turbo', displacement: '2.0L', fuel: 'Benzin', power: '190-310 PS', cylinders: 4, turbo: true, config: 'Inline-4 FSI Turbo' },
      'EA839': { engine: 'TFSI V6', displacement: '3.0L', fuel: 'Benzin', power: '340-354 PS', cylinders: 6, turbo: true, config: 'V6 TFSI Turbo' },
      'EA855': { engine: 'RS TFSI', displacement: '2.5L', fuel: 'Benzin', power: '400 PS', cylinders: 5, turbo: true, config: 'Inline-5 TFSI RS Turbo' }
    },

    // Volkswagen (existing entries preserved)
    'Volkswagen': {
      'EA211': { engine: 'TSI', displacement: '1.0L-1.5L', fuel: 'Benzin', power: '75-150 PS', cylinders: 3, turbo: true, config: 'Inline-3/4 TSI Turbo' },
      'EA888': { engine: 'TSI', displacement: '2.0L', fuel: 'Benzin', power: '190-245 PS', cylinders: 4, turbo: true, config: 'Inline-4 TSI Turbo' },
      'EA288': { engine: 'TDI', displacement: '2.0L', fuel: 'Diesel', power: '110-150 PS', cylinders: 4, turbo: true, config: 'Inline-4 TDI Common Rail' }
    },

    // Porsche (existing entries preserved)
    'Porsche': {
      'MA1': { engine: '911 Carrera', displacement: '3.0L', fuel: 'Benzin', power: '385 PS', cylinders: 6, turbo: true, config: 'Boxer-6 Twin-Turbo' },
      'MA2': { engine: '911 Carrera S', displacement: '3.0L', fuel: 'Benzin', power: '450 PS', cylinders: 6, turbo: true, config: 'Boxer-6 Twin-Turbo Sport' },
      'MCB': { engine: 'Cayenne V6', displacement: '3.0L', fuel: 'Benzin', power: '340 PS', cylinders: 6, turbo: true, config: 'V6 Single Turbo SUV' },
      'MCF': { engine: 'Cayenne Turbo', displacement: '4.0L', fuel: 'Benzin', power: '550 PS', cylinders: 8, turbo: true, config: 'V8 Twin-Turbo Performance SUV' },
      'PY3': { engine: 'Cayenne Turbo S E-Hybrid', displacement: '4.0L + Elektro', fuel: 'Hybrid', power: '680 PS', cylinders: 8, turbo: true, config: 'Plugin-Hybrid Performance SUV' }
    },

    // NEW ENGINE CODES - Toyota
    'Toyota': {
      '2GR': { engine: '2GR-FE V6', displacement: '3.5L', fuel: 'Benzin', power: '268-306 PS', cylinders: 6, turbo: false, config: 'V6 DOHC Dual VVT-i' },
      '8AR': { engine: '8AR-FTS Turbo', displacement: '2.0L', fuel: 'Benzin', power: '238-272 PS', cylinders: 4, turbo: true, config: 'Inline-4 Twin-Scroll Turbo' },
      '2ZR': { engine: '2ZR-FXE Hybrid', displacement: '1.8L', fuel: 'Hybrid', power: '122 PS', cylinders: 4, turbo: false, config: 'Inline-4 Atkinson Cycle Hybrid' },
      'A25A': { engine: 'Dynamic Force', displacement: '2.5L', fuel: 'Benzin', power: '203 PS', cylinders: 4, turbo: false, config: 'Inline-4 DOHC Direct Injection' },
      '2JZ': { engine: '2JZ-GTE Twin Turbo', displacement: '3.0L', fuel: 'Benzin', power: '330 PS', cylinders: 6, turbo: true, config: 'Inline-6 Sequential Twin-Turbo' }
    },

    // NEW ENGINE CODES - Honda
    'Honda': {
      'K20C': { engine: 'VTEC Turbo', displacement: '2.0L', fuel: 'Benzin', power: '306-320 PS', cylinders: 4, turbo: true, config: 'Inline-4 VTEC Turbo Type R' },
      'L15B': { engine: 'VTEC Turbo', displacement: '1.5L', fuel: 'Benzin', power: '174-205 PS', cylinders: 4, turbo: true, config: 'Inline-4 VTEC Turbo CVT' },
      'K24W': { engine: 'i-VTEC', displacement: '2.4L', fuel: 'Benzin', power: '185-206 PS', cylinders: 4, turbo: false, config: 'Inline-4 i-VTEC DOHC' },
      'J35A': { engine: 'VTEC V6', displacement: '3.5L', fuel: 'Benzin', power: '280-290 PS', cylinders: 6, turbo: false, config: 'V6 SOHC VTEC' },
      'LFA': { engine: 'Sport Hybrid', displacement: '3.0L + Elektro', fuel: 'Hybrid', power: '377 PS', cylinders: 6, turbo: true, config: 'V6 Twin-Turbo Hybrid NSX' }
    },

    // NEW ENGINE CODES - Nissan
    'Nissan': {
      'VR30': { engine: 'V6 Twin Turbo', displacement: '3.0L', fuel: 'Benzin', power: '300-400 PS', cylinders: 6, turbo: true, config: 'V6 Twin-Turbo DOHC' },
      'QR25': { engine: 'QR25DE', displacement: '2.5L', fuel: 'Benzin', power: '182 PS', cylinders: 4, turbo: false, config: 'Inline-4 DOHC CVT' },
      'KA24': { engine: 'KA24DE', displacement: '2.4L', fuel: 'Benzin', power: '155 PS', cylinders: 4, turbo: false, config: 'Inline-4 DOHC' },
      'VQ35': { engine: 'VQ35DE V6', displacement: '3.5L', fuel: 'Benzin', power: '306 PS', cylinders: 6, turbo: false, config: 'V6 DOHC CVTCS' },
      'VC-T': { engine: 'VC-Turbo', displacement: '2.0L', fuel: 'Benzin', power: '272 PS', cylinders: 4, turbo: true, config: 'Variable Compression Turbo' }
    },

    // NEW ENGINE CODES - Hyundai
    'Hyundai': {
      'G4KH': { engine: 'Theta II Turbo', displacement: '2.0L', fuel: 'Benzin', power: '245-275 PS', cylinders: 4, turbo: true, config: 'Inline-4 GDI Turbo' },
      'G4KE': { engine: 'Theta II', displacement: '2.4L', fuel: 'Benzin', power: '185 PS', cylinders: 4, turbo: false, config: 'Inline-4 GDI MPI' },
      'G6DJ': { engine: 'Lambda II', displacement: '3.3L', fuel: 'Benzin', power: '290 PS', cylinders: 6, turbo: true, config: 'V6 Twin-Turbo GDI' },
      'G6DH': { engine: 'Lambda II', displacement: '3.8L', fuel: 'Benzin', power: '311 PS', cylinders: 6, turbo: false, config: 'V6 GDI DOHC' }
    },

    // NEW ENGINE CODES - Ford
    'Ford': {
      'GTDI': { engine: 'EcoBoost 2.3L', displacement: '2.3L', fuel: 'Benzin', power: '310-350 PS', cylinders: 4, turbo: true, config: 'Inline-4 Twin-Scroll Turbo' },
      'NANO': { engine: 'EcoBoost 1.0L', displacement: '1.0L', fuel: 'Benzin', power: '100-125 PS', cylinders: 3, turbo: true, config: 'Inline-3 Fox Turbo' },
      'DURATEC': { engine: 'Duratec V6', displacement: '3.5L', fuel: 'Benzin', power: '285 PS', cylinders: 6, turbo: false, config: 'V6 DOHC Ti-VCT' },
      'COYOTE': { engine: 'Coyote V8', displacement: '5.0L', fuel: 'Benzin', power: '450-480 PS', cylinders: 8, turbo: false, config: 'V8 DOHC Ti-VCT' }
    },

    // NEW ENGINE CODES - General Motors
    'Chevrolet': {
      'LT1': { engine: 'LT1 V8', displacement: '6.2L', fuel: 'Benzin', power: '455-495 PS', cylinders: 8, turbo: false, config: 'V8 OHV DI AFM' },
      'LT4': { engine: 'LT4 Supercharged', displacement: '6.2L', fuel: 'Benzin', power: '650 PS', cylinders: 8, turbo: false, config: 'V8 Supercharged DI' },
      'LSA': { engine: 'LSA Supercharged', displacement: '6.2L', fuel: 'Benzin', power: '580 PS', cylinders: 8, turbo: false, config: 'V8 Supercharged OHV' },
      'LFX': { engine: 'LFX V6', displacement: '3.6L', fuel: 'Benzin', power: '323 PS', cylinders: 6, turbo: false, config: 'V6 DOHC VVT DI' }
    }
  },

  // Model codes organized by manufacturer (existing entries preserved, new ones added)
  modelCodes: {
    // BMW (existing entries preserved)
    'BMW': {
      'UKL': '1er/2er', 'F40': '1er', 'F44': '2er Gran Coupé',
      'G20': '3er Limousine', 'G21': '3er Touring', 'G22': '4er Coupé',
      'G30': '5er Limousine', 'G31': '5er Touring', 'G32': '6er GT',
      'G11': '7er', 'G14': '8er Cabrio', 'G15': '8er Coupé',
      'F48': 'X1', 'G01': 'X3', 'G05': 'X5', 'G07': 'X7',
      'I01': 'i3', 'I12': 'i8', 'G26': 'iX'
    },

    // Mercedes-Benz (existing entries preserved)
    'Mercedes-Benz': {
      'W177': 'A-Klasse', 'C118': 'CLA', 'X118': 'CLA Shooting Brake',
      'W205': 'C-Klasse', 'S205': 'C-Klasse T-Modell', 'C205': 'C-Klasse Coupé',
      'W213': 'E-Klasse', 'S213': 'E-Klasse T-Modell', 'C238': 'E-Klasse Coupé',
      'W223': 'S-Klasse', 'V223': 'S-Klasse lang',
      'H247': 'GLA', 'X247': 'GLB', 'X253': 'GLC', 'X166': 'GL'
    },

    // Audi (existing entries preserved)
    'Audi': {
      'GB': 'A3', 'B9': 'A4', 'F5': 'A5', 'C8': 'A6', 'C7': 'A7', 'D5': 'A8',
      'GA': 'Q2', 'FY': 'Q3', '8U': 'Q5', '4M': 'Q7', '4N': 'Q8',
      'FV': 'e-tron', 'F4': 'e-tron GT', 'GE': 'Q4 e-tron'
    },

    // Volkswagen (existing entries preserved)
    'Volkswagen': {
      'AW': 'Polo', 'AU': 'Golf', 'BW': 'Passat', 'B8': 'Arteon',
      'AD': 'T-Cross', 'A0': 'T-Roc', 'CR': 'Tiguan', 'BW': 'Touareg',
      'SJ': 'Crafter', 'C1': 'Crafter', 'C2': 'Caddy',
      'I3': 'ID.3', 'I4': 'ID.4', 'I5': 'ID.5', 'I6': 'ID.6', 'IB': 'ID. Buzz'
    },

    // Porsche (existing entries preserved)
    'Porsche': {
      '91': '911', '92': '911', '93': '911',
      'C1': 'Cayenne', 'C2': 'Cayenne Coupé',
      'M1': 'Macan', 'P1': 'Panamera',
      'B1': 'Boxster', 'C3': 'Cayman',
      'T1': 'Taycan'
    },

    // NEW MODEL CODES - Toyota
    'Toyota': {
      'ACV': 'Camry', 'ALE': 'Corolla', 'ALT': 'Altis', 'AHR': 'Prius',
      'GSU': 'Highlander', 'GRJ': 'Land Cruiser', 'TGN': 'HiLux',
      'ASA': 'RAV4', 'ACA': 'Vitz/Yaris', 'NCP': 'Vitz',
      'UZZ': 'Supra', 'ZN6': '86/GT86', 'SCP': 'Platz'
    },

    // NEW MODEL CODES - Honda
    'Honda': {
      'CV': 'Civic', 'AC': 'Accord', 'CR': 'CR-V', 'PI': 'Pilot',
      'FI': 'Fit/Jazz', 'IN': 'Insight', 'OD': 'Odyssey', 'RI': 'Ridgeline',
      'HR': 'HR-V', 'PA': 'Passport', 'TL': 'Acura TL', 'RL': 'Acura RL',
      'NC': 'NSX'
    },

    // NEW MODEL CODES - Nissan
    'Nissan': {
      'L33': 'Altima', 'B17': 'Sentra', 'Z34': '370Z', 'R35': 'GT-R',
      'T32': 'X-Trail', 'R52': 'Pathfinder', 'Z51': 'Murano',
      'P13': 'Juke', 'K13': 'Micra', 'E12': 'Note', 'U31': 'Maxima'
    },

    // NEW MODEL CODES - Hyundai
    'Hyundai': {
      'CN': 'Elantra', 'DN': 'Sonata', 'TL': 'Tucson', 'TM': 'Santa Fe',
      'GV': 'Genesis G90', 'DH': 'Genesis G80', 'IK': 'Genesis G70',
      'OS': 'i10', 'PB': 'i20', 'AD': 'i30', 'GD': 'i40',
      'BC': 'Veloster', 'SU': 'Palisade'
    },

    // NEW MODEL CODES - Ford
    'Ford': {
      'P5': 'Focus', 'P6': 'Fiesta', 'P7': 'Mondeo', 'P8': 'Kuga',
      'U2': 'Explorer', 'U6': 'Expedition', 'P2': 'F-150', 'P3': 'Mustang',
      'CD': 'EcoSport', 'BX': 'Bronco', 'C2': 'Edge', 'D4': 'Ranger'
    },

    // NEW MODEL CODES - Tesla
    'Tesla': {
      'S': 'Model S', '3': 'Model 3', 'X': 'Model X', 'Y': 'Model Y',
      'CT': 'Cybertruck', 'R': 'Roadster', 'ST': 'Semi'
    }
  },

  // Standard year codes (Position 10 in VIN) - preserved
  yearCodes: {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
    'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
    'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026, 'V': 2027,
    'W': 2028, 'X': 2029, 'Y': 2030, '1': 2001, '2': 2002, '3': 2003,
    '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009
  },

  // Mercedes-specific year decoding function (preserved)
  decodeMercedesYear: (vin, yearCode, plantCode) => {
    const currentYear = new Date().getFullYear();
    const wmi = vin.substring(0, 3);
    
    console.log('Mercedes year decoding:', { vin, yearCode, plantCode, wmi });
    
    const standardYear = VIN_DECODER.yearCodes[yearCode];
    console.log('Standard year for code', yearCode, ':', standardYear);
    
    if (wmi === 'WDC') {
      if (yearCode >= '1' && yearCode <= '9') {
        const adjustedYear = standardYear + 10;
        console.log('WDC 10-year offset:', standardYear, '->', adjustedYear);
        
        if (adjustedYear >= 2010 && adjustedYear <= currentYear + 2) {
          return adjustedYear;
        }
      }
      
      if (yearCode >= 'A' && yearCode <= 'Y') {
        return standardYear;
      }
    }
    
    return standardYear;
  },

  // Validation function (preserved)
  validateVIN: (vin) => {
    if (!vin) return false;
    const cleanVIN = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase();
    return cleanVIN.length === 17;
  },

  // Engine decoding function (preserved)
  decodeEngine: (vds, make, year) => {
    const engineCodes = VIN_DECODER.engineCodes[make];
    if (!engineCodes) {
      return {
        engine: 'Unknown',
        displacement: 'Unknown',
        fuel: 'Unknown',
        power: 'Unknown',
        cylinders: 0,
        turbo: false,
        config: 'Unknown',
        confidence: 'Low'
      };
    }

    for (const [code, engineData] of Object.entries(engineCodes)) {
      if (vds.includes(code)) {
        return {
          ...engineData,
          confidence: 'High'
        };
      }
    }

    return VIN_DECODER.guessEngineFromPattern(vds, make, year);
  },

  // Model decoding function (preserved)
  decodeModel: (vds, make) => {
    const modelCodes = VIN_DECODER.modelCodes[make];
    if (!modelCodes) {
      return { series: null, generation: null, productionYears: null };
    }

    for (const [code, model] of Object.entries(modelCodes)) {
      if (vds.includes(code)) {
        return {
          series: model,
          generation: VIN_DECODER.getGeneration(make, model),
          productionYears: VIN_DECODER.getProductionYears(make, model)
        };
      }
    }

    return { series: null, generation: null, productionYears: null };
  },

  // Pattern-based engine guessing (preserved and extended)
  guessEngineFromPattern: (vds, make, year) => {
    const patterns = {
      'BMW': {
        'D': { fuel: 'Diesel', turbo: true, config: 'Diesel Turbo' },
        'E': { fuel: 'Benzin', turbo: true, config: 'Benzin Turbo' },
        'F': { fuel: 'Benzin', turbo: false, config: 'Benzin Saugmotor' },
        'H': { fuel: 'Diesel', turbo: true, config: 'Diesel Common Rail' },
        'Z': { fuel: 'Elektro', turbo: false, config: 'Elektroantrieb' },
        'Y': { fuel: 'Hybrid', turbo: true, config: 'Plugin-Hybrid' }
      },
      'Mercedes-Benz': {
        'D': { fuel: 'Diesel', turbo: true, config: 'BlueTEC Diesel' },
        'G': { fuel: 'Benzin', turbo: true, config: 'CGI Turbo' },
        'M': { fuel: 'Benzin', turbo: false, config: 'Kompressor' },
        'E': { fuel: 'Elektro', turbo: false, config: 'EQC Electric' },
        'H': { fuel: 'Hybrid', turbo: true, config: 'Plug-in Hybrid' }
      },
      'Toyota': {
        'H': { fuel: 'Hybrid', turbo: false, config: 'Toyota Hybrid Synergy' },
        'T': { fuel: 'Benzin', turbo: true, config: 'Turbo' },
        'D': { fuel: 'Diesel', turbo: true, config: 'D-4D Diesel' },
        'G': { fuel: 'Benzin', turbo: false, config: 'VVT-i Gasoline' }
      },
      'Honda': {
        'V': { fuel: 'Benzin', turbo: false, config: 'VTEC' },
        'T': { fuel: 'Benzin', turbo: true, config: 'VTEC Turbo' },
        'H': { fuel: 'Hybrid', turbo: false, config: 'i-MMD Hybrid' },
        'I': { fuel: 'Benzin', turbo: false, config: 'i-VTEC' }
      },
      'Ford': {
        'E': { fuel: 'Benzin', turbo: true, config: 'EcoBoost' },
        'D': { fuel: 'Diesel', turbo: true, config: 'TDCi Diesel' },
        'H': { fuel: 'Hybrid', turbo: false, config: 'Ford Hybrid' },
        'T': { fuel: 'Benzin', turbo: true, config: 'Turbo' }
      }
    };

    const makePatterns = patterns[make];
    if (!makePatterns) {
      return {
        engine: 'Unknown Pattern',
        displacement: 'Unknown',
        fuel: 'Unknown',
        power: 'Unknown',
        cylinders: 0,
        turbo: false,
        config: 'Pattern-based guess',
        confidence: 'Low'
      };
    }

    for (const [pattern, data] of Object.entries(makePatterns)) {
      if (vds.includes(pattern)) {
        return {
          engine: `${make} ${pattern}-Series`,
          displacement: 'Unknown',
          fuel: data.fuel,
          power: 'Unknown',
          cylinders: 0,
          turbo: data.turbo,
          config: data.config,
          confidence: 'Medium'
        };
      }
    }

    return {
      engine: 'Unknown',
      displacement: 'Unknown',
      fuel: 'Unknown',
      power: 'Unknown',
      cylinders: 0,
      turbo: false,
      config: 'Unknown',
      confidence: 'Low'
    };
  },

  // Helper functions (preserved)
  getGeneration: (make, model) => {
    return `Current Generation`;
  },

  getProductionYears: (make, model) => {
    return `2020-Present`;
  },

  // Main VIN decoding function (preserved with enhanced functionality)
  decodeVIN: function(vin) {
    if (!vin) return null;
    
    const cleanVIN = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase();
    
    if (cleanVIN.length !== 17) {
      return { isValid: false, error: 'VIN must be exactly 17 characters' };
    }
    
    // VIN segments
    const wmi = cleanVIN.substring(0, 3);
    const vds = cleanVIN.substring(3, 9);
    const yearCode = cleanVIN.charAt(9);
    const plantCode = cleanVIN.charAt(10);
    const serialNumber = cleanVIN.substring(11);
    
    // Manufacturer information
    const manufacturer = VIN_DECODER.manufacturers[wmi];
    
    // Year decoding (Mercedes-specific handling)
    let year = null;
    let yearDebugInfo = { method: 'unknown', originalCode: yearCode };
    
    if (manufacturer && manufacturer.make === 'Mercedes-Benz') {
      console.log('Mercedes-Benz VIN detected, special year decoding...', { vin: cleanVIN, yearCode, plantCode });
      year = VIN_DECODER.decodeMercedesYear(cleanVIN, yearCode, plantCode);
      yearDebugInfo.method = 'Mercedes-Special';
      yearDebugInfo.result = year;
    } else {
      year = VIN_DECODER.yearCodes[yearCode];
      yearDebugInfo.method = 'Standard';
      yearDebugInfo.result = year;
    }
    
    console.log('Year decoding result:', yearDebugInfo);
    
    const vehicleAge = year ? new Date().getFullYear() - year : null;
    
    if (!manufacturer) {
      return { isValid: false, error: `Unknown manufacturer code: ${wmi}` };
    }

    // Engine decoding
    const engineInfo = VIN_DECODER.decodeEngine(vds, manufacturer.make, year);
    
    // Model decoding
    const modelInfo = VIN_DECODER.decodeModel(vds, manufacturer.make);
    
    // Assembly plant information
    const getPlantInfo = () => {
      const plantMappings = {
        'WBA': {
          '0': 'München Werk 1', '1': 'München Werk 2', '2': 'Dingolfing', 
          '3': 'Berlin', '4': 'Regensburg', '5': 'Leipzig'
        },
        'WDD': {
          '0': 'Sindelfingen', '1': 'Bremen', '2': 'Rastatt', 
          '3': 'Hamburg', '4': 'Düsseldorf', '5': 'Kecskemét'
        },
        'WAU': {
          '0': 'Ingolstadt', '1': 'Neckarsulm', '2': 'Győr', 
          '3': 'Brüssel', '4': 'Martorell', '5': 'San José'
        },
        'WVW': {
          '0': 'Wolfsburg', '1': 'Emden', '2': 'Kassel', 
          '3': 'Salzgitter', '4': 'Braunschweig', '5': 'Hannover'
        },
        'JTD': {
          '0': 'Toyota City', '1': 'Tahara', '2': 'Tsutsumi',
          '3': 'Motomachi', '4': 'Yoshiwara', '5': 'Miyata'
        },
        '1HG': {
          '0': 'Marysville', '1': 'East Liberty', '2': 'Anna',
          '3': 'Greensburg', '4': 'Lincoln', '5': 'Alliston'
        }
      };
      return plantMappings[wmi]?.[plantCode] || `Plant Code: ${plantCode}`;
    };

    // Basic technical specifications
    const getBasicSpecs = () => {
      const specs = {
        emissionStandard: year >= 2017 ? 'Euro 6d-TEMP/6d' : year >= 2014 ? 'Euro 6' : year >= 2009 ? 'Euro 5' : 'Euro 4',
        registrationRequired: vehicleAge && vehicleAge >= 3,
        nextInspection: vehicleAge && vehicleAge >= 3 ? `TÜV in ${Math.max(0, 2 - (vehicleAge % 2))} Jahren` : 'Keine TÜV-Pflicht',
        warrantyStatus: vehicleAge <= 2 ? 'Herstellergarantie aktiv' : 'Herstellergarantie abgelaufen'
      };

      if (manufacturer.country === 'Deutschland') {
        specs.origin = 'EU-Fahrzeug';
        specs.import = false;
      } else {
        specs.origin = `Import aus ${manufacturer.country}`;
        specs.import = true;
      }

      return specs;
    };

    // Comprehensive result object
    return {
      isValid: true,
      vin: cleanVIN,
      
      // Basic vehicle information
      manufacturer: {
        name: manufacturer.make,
        country: manufacturer.country,
        type: manufacturer.type,
        plant: manufacturer.plant,
        assemblyPlant: getPlantInfo()
      },
      
      // Model and series information
      model: {
        series: modelInfo.series || 'Unknown Series',
        generation: modelInfo.generation,
        productionYears: modelInfo.productionYears
      },
      
      // Engine specifications
      engine: {
        name: engineInfo.engine,
        displacement: engineInfo.displacement,
        fuelType: engineInfo.fuel,
        power: engineInfo.power,
        cylinders: engineInfo.cylinders,
        turbo: engineInfo.turbo,
        configuration: engineInfo.config,
        confidence: engineInfo.confidence
      },
      
      // Year and age information
      year: {
        modelYear: year,
        yearCode: yearCode,
        age: vehicleAge,
        decodingMethod: yearDebugInfo.method
      },
      
      // Technical specifications
      specifications: getBasicSpecs(),
      
      // VIN structure breakdown
      vinStructure: {
        wmi: wmi,
        vds: vds,
        vis: cleanVIN.substring(10),
        yearCode: yearCode,
        plantCode: plantCode,
        serialNumber: serialNumber
      },
      
      // Market and regulatory information
      market: {
        primaryMarket: manufacturer.country === 'Deutschland' ? 'European Union' : manufacturer.country,
        importStatus: manufacturer.country !== 'Deutschland',
        regulatoryCompliance: year >= 2017 ? 'Euro 6d compliant' : 'Legacy emissions'
      }
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VIN_DECODER;
}