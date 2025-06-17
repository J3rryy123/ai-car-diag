// utils/vinDecoder.js - Erweiterte VIN-Dekodierung mit umfassender Motorerkennung

const ENHANCED_VIN_DECODER = {
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
    
    // Weitere
    'VSS': { make: 'SEAT', country: 'Spanien', type: 'PKW', plant: 'Martorell' },
    'TMB': { make: 'Škoda', country: 'Tschechien', type: 'PKW', plant: 'Mladá Boleslav' },
    'TRU': { make: 'Škoda', country: 'Tschechien', type: 'SUV', plant: 'Kvasiny' },
    'WME': { make: 'smart', country: 'Deutschland', type: 'Kleinwagen', plant: 'Hambach' },
    'VF1': { make: 'Renault', country: 'Frankreich', type: 'PKW', plant: 'Flins/Sandouville' },
    'VF3': { make: 'Peugeot', country: 'Frankreich', type: 'PKW', plant: 'Sochaux/Mulhouse' },
    'VF7': { make: 'Citroën', country: 'Frankreich', type: 'PKW', plant: 'Rennes/Aulnay' },
    'ZFA': { make: 'Fiat', country: 'Italien', type: 'PKW', plant: 'Turin/Melfi' },
    'YV1': { make: 'Volvo', country: 'Schweden', type: 'PKW', plant: 'Göteborg/Gent' },
    'JHM': { make: 'Honda', country: 'Japan', type: 'PKW', plant: 'Suzuka/Kumamoto' },
    'JTD': { make: 'Toyota', country: 'Japan', type: 'PKW', plant: 'Toyota City' },
    'KMH': { make: 'Hyundai', country: 'Südkorea', type: 'PKW', plant: 'Ulsan/Asan' },
    'KNA': { make: 'Kia', country: 'Südkorea', type: 'PKW', plant: 'Sohari/Hwaseong' }
  },

  // Motor-Dekodierung basierend auf VDS (Zeichen 4-8)
  engineCodes: {
    // BMW Motoren (WBA/WBS/WBY)
    'BMW': {
      // 3-Zylinder Benziner
      'E8A': { engine: 'B38 1.5i', displacement: '1.5L', fuel: 'Benzin', power: '100-140 PS', cylinders: 3, turbo: true, config: 'Inline-3 Turbo' },
      'E8B': { engine: 'B38 1.5i TwinPower', displacement: '1.5L', fuel: 'Benzin', power: '136 PS', cylinders: 3, turbo: true, config: 'I3 TwinPower Turbo' },
      'E9A': { engine: 'B38 1.5i Sport', displacement: '1.5L', fuel: 'Benzin', power: '140 PS', cylinders: 3, turbo: true, config: 'I3 TwinPower Performance' },
      
      // 4-Zylinder Benziner
      'E8C': { engine: 'B48 2.0i', displacement: '2.0L', fuel: 'Benzin', power: '184-252 PS', cylinders: 4, turbo: true, config: 'Inline-4 Turbo' },
      'E8D': { engine: 'B48 2.0i TwinPower', displacement: '2.0L', fuel: 'Benzin', power: '192-245 PS', cylinders: 4, turbo: true, config: 'I4 TwinPower Turbo' },
      'F8A': { engine: 'N20 2.0i', displacement: '2.0L', fuel: 'Benzin', power: '184-245 PS', cylinders: 4, turbo: true, config: 'I4 Twin-Scroll Turbo' },
      'F8B': { engine: 'N26 2.0i', displacement: '2.0L', fuel: 'Benzin', power: '184-245 PS', cylinders: 4, turbo: true, config: 'I4 TwinPower Clean' },
      'F9A': { engine: 'B46 2.0i', displacement: '2.0L', fuel: 'Benzin', power: '192 PS', cylinders: 4, turbo: true, config: 'I4 TwinPower mild-hybrid' },
      
      // 6-Zylinder Benziner
      'E8F': { engine: 'B58 3.0i', displacement: '3.0L', fuel: 'Benzin', power: '340-374 PS', cylinders: 6, turbo: true, config: 'Inline-6 TwinPower' },
      'E9B': { engine: 'B58 3.0i M Performance', displacement: '3.0L', fuel: 'Benzin', power: '387 PS', cylinders: 6, turbo: true, config: 'I6 M Performance Turbo' },
      'G8A': { engine: 'S55 3.0i M', displacement: '3.0L', fuel: 'Benzin', power: '431-450 PS', cylinders: 6, turbo: true, config: 'I6 M TwinTurbo' },
      'G8B': { engine: 'S58 3.0i M', displacement: '3.0L', fuel: 'Benzin', power: '480-510 PS', cylinders: 6, turbo: true, config: 'I6 M Competition TwinTurbo' },
      'G9A': { engine: 'N55 3.0i', displacement: '3.0L', fuel: 'Benzin', power: '306 PS', cylinders: 6, turbo: true, config: 'I6 Single TwinScroll Turbo' },
      'G9B': { engine: 'N54 3.0i', displacement: '3.0L', fuel: 'Benzin', power: '306 PS', cylinders: 6, turbo: true, config: 'I6 Twin-Turbo (klassisch)' },
      
      // V8 Benziner
      'V8A': { engine: 'N63 4.4i V8', displacement: '4.4L', fuel: 'Benzin', power: '407-530 PS', cylinders: 8, turbo: true, config: 'V8 TwinTurbo' },
      'V8B': { engine: 'S63 4.4i M V8', displacement: '4.4L', fuel: 'Benzin', power: '560-625 PS', cylinders: 8, turbo: true, config: 'V8 M TwinTurbo Competition' },
      'V8C': { engine: 'N74 6.0i V12', displacement: '6.0L', fuel: 'Benzin', power: '544 PS', cylinders: 12, turbo: true, config: 'V12 TwinTurbo' },
      
      // 3-Zylinder Diesel
      'D8A': { engine: 'B37 1.5d', displacement: '1.5L', fuel: 'Diesel', power: '116 PS', cylinders: 3, turbo: true, config: 'I3 Turbo Diesel' },
      'D9A': { engine: 'B37 1.5d mild-hybrid', displacement: '1.5L', fuel: 'Diesel', power: '122 PS', cylinders: 3, turbo: true, config: 'I3 mild-hybrid Diesel' },
      
      // 4-Zylinder Diesel
      'D8B': { engine: 'B47 2.0d', displacement: '2.0L', fuel: 'Diesel', power: '150-190 PS', cylinders: 4, turbo: true, config: 'I4 Turbo Diesel' },
      'D8C': { engine: 'B47 2.0d xDrive', displacement: '2.0L', fuel: 'Diesel', power: '190 PS', cylinders: 4, turbo: true, config: 'I4 AWD Turbo Diesel' },
      'H8A': { engine: 'N47 2.0d', displacement: '2.0L', fuel: 'Diesel', power: '143-177 PS', cylinders: 4, turbo: true, config: 'I4 Common Rail Diesel' },
      'H9A': { engine: 'N47S 2.0d', displacement: '2.0L', fuel: 'Diesel', power: '184 PS', cylinders: 4, turbo: true, config: 'I4 Sport Diesel' },
      
      // 6-Zylinder Diesel
      'D8D': { engine: 'B57 3.0d', displacement: '3.0L', fuel: 'Diesel', power: '265-340 PS', cylinders: 6, turbo: true, config: 'I6 Turbo Diesel' },
      'H8B': { engine: 'N57 3.0d', displacement: '3.0L', fuel: 'Diesel', power: '218-313 PS', cylinders: 6, turbo: true, config: 'I6 Twin-Turbo Diesel' },
      'H9B': { engine: 'N57S 3.0d M Performance', displacement: '3.0L', fuel: 'Diesel', power: '381 PS', cylinders: 6, turbo: true, config: 'I6 M Performance Diesel' },
      
      // Elektro
      'Z8A': { engine: 'iX3 Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '286 PS', cylinders: 0, turbo: false, config: 'Heckantrieb Elektro' },
      'Z8B': { engine: 'i3 Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '170 PS', cylinders: 0, turbo: false, config: 'Stadtfahrzeug Elektro' },
      'Z8C': { engine: 'i4 eDrive40', displacement: 'Elektro', fuel: 'Elektro', power: '340 PS', cylinders: 0, turbo: false, config: 'Heckantrieb Elektro Performance' },
      'Z8D': { engine: 'i4 M50', displacement: 'Elektro', fuel: 'Elektro', power: '544 PS', cylinders: 0, turbo: false, config: 'Allradantrieb M Elektro' },
      'Z9A': { engine: 'iX xDrive40', displacement: 'Elektro', fuel: 'Elektro', power: '326 PS', cylinders: 0, turbo: false, config: 'AWD SUV Elektro' },
      'Z9B': { engine: 'iX M60', displacement: 'Elektro', fuel: 'Elektro', power: '619 PS', cylinders: 0, turbo: false, config: 'M Performance SUV Elektro' },
      
      // Hybrid/Plugin-Hybrid
      'Y8A': { engine: '225xe Hybrid', displacement: '1.5L + Elektro', fuel: 'Hybrid', power: '224 PS', cylinders: 3, turbo: true, config: 'Plugin-Hybrid AWD' },
      'Y8B': { engine: '330e Hybrid', displacement: '2.0L + Elektro', fuel: 'Hybrid', power: '252-292 PS', cylinders: 4, turbo: true, config: 'Plugin-Hybrid RWD' },
      'Y8C': { engine: '530e Hybrid', displacement: '2.0L + Elektro', fuel: 'Hybrid', power: '292 PS', cylinders: 4, turbo: true, config: 'Plugin-Hybrid Limousine' },
      'Y9A': { engine: 'X5 xDrive45e', displacement: '3.0L + Elektro', fuel: 'Hybrid', power: '394 PS', cylinders: 6, turbo: true, config: 'Plugin-Hybrid SUV' }
    },

    // Mercedes-Benz Motoren (WDB/WDD/WDC)
    'Mercedes-Benz': {
      // 4-Zylinder Benziner
      'E1A': { engine: 'M260 1.3', displacement: '1.3L', fuel: 'Benzin', power: '136-163 PS', cylinders: 4, turbo: true, config: 'I4 Turbo' },
      'E1B': { engine: 'M264 1.5', displacement: '1.5L', fuel: 'Benzin', power: '156-184 PS', cylinders: 4, turbo: true, config: 'I4 Turbo mit EQ Boost' },
      'E1C': { engine: 'M264 2.0', displacement: '2.0L', fuel: 'Benzin', power: '184-258 PS', cylinders: 4, turbo: true, config: 'I4 Turbo Hochleistung' },
      'F1A': { engine: 'M274 2.0', displacement: '2.0L', fuel: 'Benzin', power: '184-211 PS', cylinders: 4, turbo: true, config: 'I4 BlueDIRECT Turbo' },
      'F1B': { engine: 'M270 1.6', displacement: '1.6L', fuel: 'Benzin', power: '122-156 PS', cylinders: 4, turbo: true, config: 'I4 CGI Turbo' },
      
      // 6-Zylinder Benziner
      'E1D': { engine: 'M256 3.0', displacement: '3.0L', fuel: 'Benzin', power: '367-435 PS', cylinders: 6, turbo: true, config: 'I6 Turbo mit EQ Boost' },
      'F1C': { engine: 'M276 3.0', displacement: '3.0L', fuel: 'Benzin', power: '333-367 PS', cylinders: 6, turbo: true, config: 'V6 BiTurbo' },
      'F1D': { engine: 'M276 3.5', displacement: '3.5L', fuel: 'Benzin', power: '306-333 PS', cylinders: 6, turbo: true, config: 'V6 CGI BiTurbo' },
      'F2A': { engine: 'M272 3.0', displacement: '3.0L', fuel: 'Benzin', power: '231 PS', cylinders: 6, turbo: false, config: 'V6 CGI Saugmotor' },
      'F2B': { engine: 'M272 3.5', displacement: '3.5L', fuel: 'Benzin', power: '272 PS', cylinders: 6, turbo: false, config: 'V6 CGI Hochleistung' },
      
      // V8 Benziner
      'G1A': { engine: 'M177 4.0 V8', displacement: '4.0L', fuel: 'Benzin', power: '476-630 PS', cylinders: 8, turbo: true, config: 'V8 BiTurbo' },
      'G1B': { engine: 'M178 4.0 V8', displacement: '4.0L', fuel: 'Benzin', power: '585-730 PS', cylinders: 8, turbo: true, config: 'V8 AMG BiTurbo' },
      'G1C': { engine: 'M176 4.0 V8', displacement: '4.0L', fuel: 'Benzin', power: '421 PS', cylinders: 8, turbo: true, config: 'V8 BiTurbo Basis' },
      'G2A': { engine: 'M273 5.5 V8', displacement: '5.5L', fuel: 'Benzin', power: '388 PS', cylinders: 8, turbo: false, config: 'V8 CGI Saugmotor' },
      'G2B': { engine: 'M159 6.2 V8', displacement: '6.2L', fuel: 'Benzin', power: '457-571 PS', cylinders: 8, turbo: false, config: 'V8 AMG Saugmotor' },
      
      // V12 Benziner
      'V12A': { engine: 'M279 6.0 V12', displacement: '6.0L', fuel: 'Benzin', power: '630 PS', cylinders: 12, turbo: true, config: 'V12 BiTurbo' },
      'V12B': { engine: 'M275 5.5 V12', displacement: '5.5L', fuel: 'Benzin', power: '517 PS', cylinders: 12, turbo: true, config: 'V12 BiTurbo klassisch' },
      
      // 4-Zylinder Diesel
      'D1A': { engine: 'OM654 2.0', displacement: '2.0L', fuel: 'Diesel', power: '150-245 PS', cylinders: 4, turbo: true, config: 'I4 BlueTEC Turbo' },
      'H1A': { engine: 'OM651 2.1', displacement: '2.1L', fuel: 'Diesel', power: '136-204 PS', cylinders: 4, turbo: true, config: 'I4 CDI Turbo' },
      'H1D': { engine: 'OM640 1.6', displacement: '1.6L', fuel: 'Diesel', power: '109-136 PS', cylinders: 4, turbo: true, config: 'I4 CDI Kompakt' },
      
      // 6-Zylinder Diesel
      'D1B': { engine: 'OM656 3.0', displacement: '3.0L', fuel: 'Diesel', power: '286-340 PS', cylinders: 6, turbo: true, config: 'I6 BlueTEC Turbo' },
      'H1B': { engine: 'OM642 3.0 V6', displacement: '3.0L', fuel: 'Diesel', power: '204-258 PS', cylinders: 6, turbo: true, config: 'V6 CDI BlueTEC' },
      'H1C': { engine: 'OM629 3.0 V6', displacement: '3.0L', fuel: 'Diesel', power: '231-265 PS', cylinders: 6, turbo: true, config: 'V6 CDI BiTurbo' },
      
      // Elektro
      'Z1A': { engine: 'EQA Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '190-292 PS', cylinders: 0, turbo: false, config: 'Kompakt Elektro' },
      'Z1B': { engine: 'EQC Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '408 PS', cylinders: 0, turbo: false, config: 'SUV Elektro AWD' },
      'Z1C': { engine: 'EQS Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '333-523 PS', cylinders: 0, turbo: false, config: 'Luxus Elektro' },
      'Z1D': { engine: 'EQE Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '292-688 PS', cylinders: 0, turbo: false, config: 'Business Elektro' },
      'Z2A': { engine: 'EQV Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '204 PS', cylinders: 0, turbo: false, config: 'Van Elektro' },
      
      // Hybrid/Plugin-Hybrid
      'Y1A': { engine: 'C300e Hybrid', displacement: '2.0L + Elektro', fuel: 'Hybrid', power: '320 PS', cylinders: 4, turbo: true, config: 'Plugin-Hybrid Limousine' },
      'Y1B': { engine: 'E300e Hybrid', displacement: '2.0L + Elektro', fuel: 'Hybrid', power: '320 PS', cylinders: 4, turbo: true, config: 'Plugin-Hybrid Oberklasse' },
      'Y1C': { engine: 'GLC300e Hybrid', displacement: '2.0L + Elektro', fuel: 'Hybrid', power: '320 PS', cylinders: 4, turbo: true, config: 'Plugin-Hybrid SUV' },
      'Y2A': { engine: 'S580e Hybrid', displacement: '3.0L + Elektro', fuel: 'Hybrid', power: '510 PS', cylinders: 6, turbo: true, config: 'Plugin-Hybrid Luxus' }
    },

    // Audi Motoren (WAU/WA1)
    'Audi': {
      // 3-Zylinder Benziner TFSI
      'E2A': { engine: '1.0 TFSI', displacement: '1.0L', fuel: 'Benzin', power: '95-115 PS', cylinders: 3, turbo: true, config: 'I3 Turbo' },
      'E3A': { engine: '1.0 TFSI mild-hybrid', displacement: '1.0L', fuel: 'Benzin', power: '110 PS', cylinders: 3, turbo: true, config: 'I3 MHEV Turbo' },
      
      // 4-Zylinder Benziner TFSI
      'E2B': { engine: '1.4 TFSI', displacement: '1.4L', fuel: 'Benzin', power: '125-150 PS', cylinders: 4, turbo: true, config: 'I4 Turbo' },
      'E2C': { engine: '1.5 TFSI', displacement: '1.5L', fuel: 'Benzin', power: '150 PS', cylinders: 4, turbo: true, config: 'I4 COD Turbo' },
      'E2D': { engine: '2.0 TFSI', displacement: '2.0L', fuel: 'Benzin', power: '190-400 PS', cylinders: 4, turbo: true, config: 'I4 Turbo Hochleistung' },
      'E3B': { engine: '1.4 TFSI e-tron', displacement: '1.4L + Elektro', fuel: 'Hybrid', power: '204 PS', cylinders: 4, turbo: true, config: 'I4 Plugin-Hybrid' },
      'E3C': { engine: '1.5 TFSI mild-hybrid', displacement: '1.5L', fuel: 'Benzin', power: '150 PS', cylinders: 4, turbo: true, config: 'I4 MHEV Turbo' },
      
      // 5-Zylinder Benziner TFSI
      'E2F': { engine: '2.5 TFSI', displacement: '2.5L', fuel: 'Benzin', power: '400 PS', cylinders: 5, turbo: true, config: 'I5 RS Turbo' },
      'E3D': { engine: '2.5 TFSI RS', displacement: '2.5L', fuel: 'Benzin', power: '450 PS', cylinders: 5, turbo: true, config: 'I5 RS Performance' },
      
      // 6-Zylinder Benziner TFSI
      'F2A': { engine: '3.0 TFSI', displacement: '3.0L', fuel: 'Benzin', power: '354 PS', cylinders: 6, turbo: true, config: 'V6 Turbo' },
      'F2B': { engine: '2.9 TFSI', displacement: '2.9L', fuel: 'Benzin', power: '450 PS', cylinders: 6, turbo: true, config: 'V6 BiTurbo' },
      'F3A': { engine: '3.0 TFSI mild-hybrid', displacement: '3.0L', fuel: 'Benzin', power: '340-367 PS', cylinders: 6, turbo: true, config: 'V6 MHEV Turbo' },
      'F3B': { engine: '2.9 TFSI RS', displacement: '2.9L', fuel: 'Benzin', power: '450-600 PS', cylinders: 6, turbo: true, config: 'V6 RS BiTurbo' },
      
      // V8 Benziner TFSI
      'G2A': { engine: '4.0 TFSI', displacement: '4.0L', fuel: 'Benzin', power: '560-650 PS', cylinders: 8, turbo: true, config: 'V8 BiTurbo' },
      'G3A': { engine: '4.0 TFSI mild-hybrid', displacement: '4.0L', fuel: 'Benzin', power: '460 PS', cylinders: 8, turbo: true, config: 'V8 MHEV BiTurbo' },
      
      // 3-Zylinder Diesel TDI
      'D3A': { engine: '1.6 TDI', displacement: '1.6L', fuel: 'Diesel', power: '90-116 PS', cylinders: 4, turbo: true, config: 'I4 TDI' },
      
      // 4-Zylinder Diesel TDI
      'D2A': { engine: '1.6 TDI', displacement: '1.6L', fuel: 'Diesel', power: '90-116 PS', cylinders: 4, turbo: true, config: 'I4 Common Rail TDI' },
      'D2B': { engine: '2.0 TDI', displacement: '2.0L', fuel: 'Diesel', power: '122-204 PS', cylinders: 4, turbo: true, config: 'I4 TDI Turbo' },
      'D3B': { engine: '2.0 TDI mild-hybrid', displacement: '2.0L', fuel: 'Diesel', power: '150-204 PS', cylinders: 4, turbo: true, config: 'I4 MHEV TDI' },
      
      // 6-Zylinder Diesel TDI
      'D2C': { engine: '3.0 TDI', displacement: '3.0L', fuel: 'Diesel', power: '218-286 PS', cylinders: 6, turbo: true, config: 'V6 TDI' },
      'D2D': { engine: '3.0 TDI quattro', displacement: '3.0L', fuel: 'Diesel', power: '249-286 PS', cylinders: 6, turbo: true, config: 'V6 TDI AWD' },
      'D3C': { engine: '3.0 TDI mild-hybrid', displacement: '3.0L', fuel: 'Diesel', power: '231-286 PS', cylinders: 6, turbo: true, config: 'V6 MHEV TDI' },
      
      // V8 Diesel TDI
      'H2A': { engine: '4.0 TDI', displacement: '4.0L', fuel: 'Diesel', power: '435 PS', cylinders: 8, turbo: true, config: 'V8 TDI Turbo' },
      
      // Elektro
      'Z2A': { engine: 'e-tron 50', displacement: 'Elektro', fuel: 'Elektro', power: '313 PS', cylinders: 0, turbo: false, config: 'AWD SUV Elektro' },
      'Z2B': { engine: 'e-tron 55', displacement: 'Elektro', fuel: 'Elektro', power: '408 PS', cylinders: 0, turbo: false, config: 'AWD SUV Performance' },
      'Z2C': { engine: 'e-tron GT', displacement: 'Elektro', fuel: 'Elektro', power: '476-646 PS', cylinders: 0, turbo: false, config: 'Sportwagen Elektro' },
      'Z3A': { engine: 'Q4 e-tron', displacement: 'Elektro', fuel: 'Elektro', power: '204-299 PS', cylinders: 0, turbo: false, config: 'Kompakt SUV Elektro' },
      'Z3B': { engine: 'e-tron S', displacement: 'Elektro', fuel: 'Elektro', power: '503 PS', cylinders: 0, turbo: false, config: 'Performance SUV Elektro' },
      
      // Hybrid/Plugin-Hybrid
      'Y2A': { engine: 'A3 e-tron', displacement: '1.4L + Elektro', fuel: 'Hybrid', power: '204 PS', cylinders: 4, turbo: true, config: 'Plugin-Hybrid Kompakt' },
      'Y2B': { engine: 'Q5 TFSI e', displacement: '2.0L + Elektro', fuel: 'Hybrid', power: '367 PS', cylinders: 4, turbo: true, config: 'Plugin-Hybrid SUV' },
      'Y3A': { engine: 'A6 TFSI e', displacement: '2.0L + Elektro', fuel: 'Hybrid', power: '367 PS', cylinders: 4, turbo: true, config: 'Plugin-Hybrid Oberklasse' },
      'Y3B': { engine: 'Q7 TFSI e', displacement: '3.0L + Elektro', fuel: 'Hybrid', power: '456 PS', cylinders: 6, turbo: true, config: 'Plugin-Hybrid Luxus SUV' }
    },

    // Volkswagen Motoren (WVW/WV1/WV2)
    'Volkswagen': {
      // 3-Zylinder Benziner TSI
      'E3A': { engine: '1.0 TSI', displacement: '1.0L', fuel: 'Benzin', power: '95-115 PS', cylinders: 3, turbo: true, config: 'I3 Turbo' },
      'E4A': { engine: '1.0 TSI mild-hybrid', displacement: '1.0L', fuel: 'Benzin', power: '110 PS', cylinders: 3, turbo: true, config: 'I3 eTSI mild-hybrid' },
      
      // 4-Zylinder Benziner TSI
      'E3B': { engine: '1.2 TSI', displacement: '1.2L', fuel: 'Benzin', power: '105 PS', cylinders: 4, turbo: true, config: 'I4 Turbo' },
      'E3C': { engine: '1.4 TSI', displacement: '1.4L', fuel: 'Benzin', power: '125-150 PS', cylinders: 4, turbo: true, config: 'I4 ACT Turbo' },
      'E3D': { engine: '1.5 TSI', displacement: '1.5L', fuel: 'Benzin', power: '130-150 PS', cylinders: 4, turbo: true, config: 'I4 ACT Turbo' },
      'E3F': { engine: '2.0 TSI', displacement: '2.0L', fuel: 'Benzin', power: '190-320 PS', cylinders: 4, turbo: true, config: 'I4 Turbo Performance' },
      'E4B': { engine: '1.4 TSI e-Hybrid', displacement: '1.4L + Elektro', fuel: 'Hybrid', power: '218-245 PS', cylinders: 4, turbo: true, config: 'I4 Plugin-Hybrid' },
      'E4C': { engine: '1.5 TSI mild-hybrid', displacement: '1.5L', fuel: 'Benzin', power: '150 PS', cylinders: 4, turbo: true, config: 'I4 eTSI mild-hybrid' },
      
      // 5-Zylinder und 6-Zylinder Benziner
      'F3A': { engine: '2.5 R5', displacement: '2.5L', fuel: 'Benzin', power: '170 PS', cylinders: 5, turbo: false, config: 'I5 Saugmotor' },
      'F3B': { engine: '3.6 VR6', displacement: '3.6L', fuel: 'Benzin', power: '280-300 PS', cylinders: 6, turbo: false, config: 'VR6 Saugmotor' },
      'F4A': { engine: '2.0 TSI R', displacement: '2.0L', fuel: 'Benzin', power: '320 PS', cylinders: 4, turbo: true, config: 'I4 R Performance Turbo' },
      
      // 4-Zylinder Diesel TDI
      'D3A': { engine: '1.6 TDI', displacement: '1.6L', fuel: 'Diesel', power: '90-105 PS', cylinders: 4, turbo: true, config: 'I4 Common Rail TDI' },
      'D3B': { engine: '2.0 TDI', displacement: '2.0L', fuel: 'Diesel', power: '110-204 PS', cylinders: 4, turbo: true, config: 'I4 TDI Turbo' },
      'D3C': { engine: '2.0 TDI 4Motion', displacement: '2.0L', fuel: 'Diesel', power: '150-204 PS', cylinders: 4, turbo: true, config: 'I4 AWD TDI' },
      'D4A': { engine: '2.0 TDI mild-hybrid', displacement: '2.0L', fuel: 'Diesel', power: '150 PS', cylinders: 4, turbo: true, config: 'I4 eTDI mild-hybrid' },
      
      // 6-Zylinder Diesel TDI
      'H3A': { engine: '3.0 V6 TDI', displacement: '3.0L', fuel: 'Diesel', power: '204-286 PS', cylinders: 6, turbo: true, config: 'V6 TDI BiTurbo' },
      'H4A': { engine: '3.0 V6 TDI mild-hybrid', displacement: '3.0L', fuel: 'Diesel', power: '231-286 PS', cylinders: 6, turbo: true, config: 'V6 eTDI mild-hybrid' },
      
      // Elektro
      'Z3A': { engine: 'ID.3 Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '145-204 PS', cylinders: 0, turbo: false, config: 'Kompakt Elektro RWD' },
      'Z3B': { engine: 'ID.4 Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '170-299 PS', cylinders: 0, turbo: false, config: 'SUV Elektro RWD/AWD' },
      'Z3C': { engine: 'ID.5 Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '174-286 PS', cylinders: 0, turbo: false, config: 'Coupé SUV Elektro' },
      'Z4A': { engine: 'ID.6 Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '204-340 PS', cylinders: 0, turbo: false, config: '7-Sitzer SUV Elektro' },
      'Z4B': { engine: 'ID. Buzz Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '204 PS', cylinders: 0, turbo: false, config: 'Van Elektro RWD' },
      
      // Hybrid/Plugin-Hybrid
      'Y3A': { engine: 'GTE Hybrid', displacement: '1.4L + Elektro', fuel: 'Hybrid', power: '218-245 PS', cylinders: 4, turbo: true, config: 'Plugin-Hybrid Sport' },
      'Y4A': { engine: 'Passat GTE', displacement: '1.4L + Elektro', fuel: 'Hybrid', power: '218 PS', cylinders: 4, turbo: true, config: 'Plugin-Hybrid Kombi' },
      'Y4B': { engine: 'Tiguan eHybrid', displacement: '1.4L + Elektro', fuel: 'Hybrid', power: '245 PS', cylinders: 4, turbo: true, config: 'Plugin-Hybrid SUV' }
    },

    // Porsche Motoren (WP0/WP1)
    'Porsche': {
      // 4-Zylinder Benziner Turbo
      'P1A': { engine: '2.0 Turbo', displacement: '2.0L', fuel: 'Benzin', power: '300 PS', cylinders: 4, turbo: true, config: 'I4 Turbo Basis' },
      'P1B': { engine: '2.5 Turbo', displacement: '2.5L', fuel: 'Benzin', power: '350-400 PS', cylinders: 4, turbo: true, config: 'I4 Turbo Sport' },
      'P2A': { engine: '2.0 Turbo S', displacement: '2.0L', fuel: 'Benzin', power: '350 PS', cylinders: 4, turbo: true, config: 'I4 Turbo Performance' },
      
      // 6-Zylinder Benziner
      'P1C': { engine: '2.9 V6 Turbo', displacement: '2.9L', fuel: 'Benzin', power: '440-630 PS', cylinders: 6, turbo: true, config: 'V6 BiTurbo' },
      'P1D': { engine: '3.0 Turbo', displacement: '3.0L', fuel: 'Benzin', power: '380-650 PS', cylinders: 6, turbo: true, config: 'H6 Turbo 911' },
      'P2B': { engine: '3.8 Turbo', displacement: '3.8L', fuel: 'Benzin', power: '540-700 PS', cylinders: 6, turbo: true, config: 'H6 Turbo GT' },
      'P3A': { engine: '3.0 Saugmotor', displacement: '3.0L', fuel: 'Benzin', power: '385 PS', cylinders: 6, turbo: false, config: 'H6 Saugmotor GT3' },
      'P3B': { engine: '4.0 Saugmotor', displacement: '4.0L', fuel: 'Benzin', power: '500-520 PS', cylinders: 6, turbo: false, config: 'H6 Saugmotor GT3 RS' },
      
      // V8 Benziner
      'P2C': { engine: '4.0 V8', displacement: '4.0L', fuel: 'Benzin', power: '500-630 PS', cylinders: 8, turbo: true, config: 'V8 BiTurbo' },
      'P3C': { engine: '4.0 V8 Sport', displacement: '4.0L', fuel: 'Benzin', power: '550-680 PS', cylinders: 8, turbo: true, config: 'V8 Sport BiTurbo' },
      
      // Elektro
      'PZ1': { engine: 'Taycan Elektro', displacement: 'Elektro', fuel: 'Elektro', power: '408-761 PS', cylinders: 0, turbo: false, config: 'Performance Elektro AWD' },
      'PZ2': { engine: 'Taycan 4S', displacement: 'Elektro', fuel: 'Elektro', power: '571 PS', cylinders: 0, turbo: false, config: 'Sport Elektro AWD' },
      'PZ3': { engine: 'Taycan Turbo S', displacement: 'Elektro', fuel: 'Elektro', power: '761 PS', cylinders: 0, turbo: false, config: 'Top Performance Elektro' },
      
      // Hybrid
      'PY1': { engine: 'Cayenne Hybrid', displacement: '3.0L + Elektro', fuel: 'Hybrid', power: '462 PS', cylinders: 6, turbo: true, config: 'Plugin-Hybrid SUV' },
      'PY2': { engine: 'Panamera Hybrid', displacement: '2.9L + Elektro', fuel: 'Hybrid', power: '560 PS', cylinders: 6, turbo: true, config: 'Plugin-Hybrid Sport Limousine' },
      'PY3': { engine: 'Cayenne Turbo S E-Hybrid', displacement: '4.0L + Elektro', fuel: 'Hybrid', power: '680 PS', cylinders: 8, turbo: true, config: 'Plugin-Hybrid Performance SUV' }
    }
  },

  // Standard Jahrescodes (Position 10 in VIN)
  yearCodes: {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
    'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
    'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026, 'V': 2027,
    'W': 2028, 'X': 2029, 'Y': 2030, '1': 2001, '2': 2002, '3': 2003,
    '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009
  },

  // Mercedes-spezifische Jahres-Dekodierung
  decodeMercedesYear: (vin, yearCode, plantCode) => {
    const currentYear = new Date().getFullYear();
    const wmi = vin.substring(0, 3);
    
    console.log('Mercedes Jahr-Dekodierung:', { vin, yearCode, plantCode, wmi });
    
    // Standard-Jahr erstmal ermitteln
    const standardYear = ENHANCED_VIN_DECODER.yearCodes[yearCode];
    console.log('Standard-Jahr für Code', yearCode, ':', standardYear);
    
    // Mercedes-spezifische Korrekturen basierend auf WMI
    if (wmi === 'WDC') {
      // WDC = Sprinter/Nutzfahrzeuge - verwenden oft 10-Jahre-Offset
      if (yearCode >= '1' && yearCode <= '9') {
        const adjustedYear = standardYear + 10; // 2001 -> 2011, 2002 -> 2012, etc.
        console.log('WDC 10-Jahre-Offset:', standardYear, '->', adjustedYear);
        
        // Plausibilitätsprüfung
        if (adjustedYear >= 2010 && adjustedYear <= currentYear + 2) {
          return adjustedYear;
        }
      }
      
      // Für Buchstaben-Codes bei WDC
      if (yearCode >= 'A' && yearCode <= 'Y') {
        // Diese sollten Standard sein (A=2010, B=2011, etc.)
        if (standardYear >= 2010 && standardYear <= currentYear + 2) {
          console.log('WDC Standard-Jahr (Buchstabe):', standardYear);
          return standardYear;
        }
      }
    }
    
    else if (wmi === 'WDD') {
      // WDD = PKW - meist Standard-Codes, aber mit Vorsicht bei älteren Jahren
      if (yearCode >= '1' && yearCode <= '9') {
        // Bei WDD sollten Zahlen-Codes meist Standard sein
        if (standardYear >= 2000 && standardYear <= 2009) {
          console.log('WDD Standard-Jahr (2000er):', standardYear);
          return standardYear;
        }
        // Aber wenn es zu alt erscheint, versuche Offset
        else {
          const adjustedYear = standardYear + 10;
          if (adjustedYear >= 2010 && adjustedYear <= currentYear + 2) {
            console.log('WDD 10-Jahre-Offset:', standardYear, '->', adjustedYear);
            return adjustedYear;
          }
        }
      }
      
      // Buchstaben-Codes bei WDD sind meist Standard
      if (yearCode >= 'A' && yearCode <= 'Y') {
        if (standardYear >= 2010 && standardYear <= currentYear + 2) {
          console.log('WDD Standard-Jahr (Buchstabe):', standardYear);
          return standardYear;
        }
      }
    }
    
    else if (wmi === 'WDB') {
      // WDB = Gemischte Baureihen - Standard-Codes bevorzugen
      if (standardYear >= 1990 && standardYear <= currentYear + 2) {
        console.log('WDB Standard-Jahr:', standardYear);
        return standardYear;
      }
    }
    
    // Fallback: Wenn nichts passt, versuche verschiedene Strategien
    console.log('Fallback-Strategien für Mercedes...');
    
    // Strategie 1: 10-Jahre-Offset probieren
    if (standardYear && standardYear >= 2001 && standardYear <= 2009) {
      const offsetYear = standardYear + 10;
      if (offsetYear <= currentYear + 2) {
        console.log('Fallback 10-Jahre-Offset:', standardYear, '->', offsetYear);
        return offsetYear;
      }
    }
    
    // Strategie 2: Position 11 (plantCode) als Jahr-Indikator
    const altYearCode = plantCode;
    const altYear = ENHANCED_VIN_DECODER.yearCodes[altYearCode];
    if (altYear && altYear >= 2000 && altYear <= currentYear + 2) {
      console.log('Alternative Jahr aus Position 11:', altYearCode, '->', altYear);
      return altYear;
    }
    
    // Letzte Strategie: Geschätztes Jahr basierend auf WMI
    let estimatedYear;
    if (wmi === 'WDC') {
      estimatedYear = currentYear - 8; // Sprinter werden oft länger gefahren
    } else if (wmi === 'WDD') {
      estimatedYear = currentYear - 5; // PKW sind meist jünger
    } else {
      estimatedYear = currentYear - 6; // Mittelwert
    }
    
    console.log('Geschätztes Jahr (WMI-basiert):', estimatedYear);
    return estimatedYear;
  },

  // Modell-Erkennung basierend auf VDS-Patterns
  modelCodes: {
    'BMW': {
      'A1': 'X1', 'A3': 'X3', 'A5': 'X5', 'A6': 'X6', 'A7': 'X7',
      'B1': '1er', 'B3': '3er', 'B5': '5er', 'B7': '7er', 'B8': '8er',
      'C1': 'i3', 'C3': 'i4', 'C5': 'iX3', 'C8': 'i8', 'CX': 'iX',
      'M3': 'M3', 'M4': 'M4', 'M5': 'M5', 'M8': 'M8',
      'Z3': 'Z3', 'Z4': 'Z4'
    },
    'Mercedes-Benz': {
      'A1': 'A-Klasse', 'B1': 'B-Klasse', 'C1': 'C-Klasse', 'E1': 'E-Klasse',
      'S1': 'S-Klasse', 'G1': 'G-Klasse', 'V1': 'V-Klasse',
      'L1': 'GLA', 'L2': 'GLB', 'L3': 'GLC', 'L4': 'GLE', 'L5': 'GLS',
      'M1': 'CLA', 'M2': 'CLS', 'M3': 'AMG GT',
      'Q1': 'EQA', 'Q2': 'EQB', 'Q3': 'EQC', 'Q4': 'EQE', 'Q5': 'EQS',
      'SP': 'Sprinter', 'VT': 'Vito', 'CT': 'Citan'
    },
    'Audi': {
      'A1': 'A1', 'A3': 'A3', 'A4': 'A4', 'A6': 'A6', 'A8': 'A8',
      'Q1': 'Q2', 'Q3': 'Q3', 'Q5': 'Q5', 'Q7': 'Q7', 'Q8': 'Q8',
      'T1': 'TT', 'R8': 'R8', 'S1': 'S3', 'S4': 'S4', 'S6': 'S6',
      'E1': 'e-tron', 'E4': 'e-tron GT', 'EQ': 'Q4 e-tron'
    },
    'Volkswagen': {
      'P1': 'Polo', 'G1': 'Golf', 'P2': 'Passat', 'A1': 'Arteon',
      'T1': 'Tiguan', 'T2': 'Touareg', 'T3': 'T-Cross', 'T4': 'T-Roc',
      'U1': 'Up!', 'C1': 'Crafter', 'C2': 'Caddy',
      'I3': 'ID.3', 'I4': 'ID.4', 'I5': 'ID.5', 'I6': 'ID.6', 'IB': 'ID. Buzz'
    },
    'Porsche': {
      '91': '911', '92': '911', '93': '911',
      'C1': 'Cayenne', 'C2': 'Cayenne Coupé',
      'M1': 'Macan', 'P1': 'Panamera',
      'B1': 'Boxster', 'C3': 'Cayman',
      'T1': 'Taycan'
    }
  },

  // Hauptfunktion - Erweiterte VIN-Dekodierung mit Motor
  decodeVIN: function(vin) {
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
    const manufacturer = ENHANCED_VIN_DECODER.manufacturers[wmi];
    
    // Jahr-Dekodierung (Mercedes-spezifische Behandlung)
    let year = null;
    let yearDebugInfo = { method: 'unbekannt', originalCode: yearCode };
    
    if (manufacturer && manufacturer.make === 'Mercedes-Benz') {
      console.log('Mercedes-Benz VIN erkannt, spezielle Jahr-Dekodierung...', { vin: cleanVIN, yearCode, plantCode });
      year = ENHANCED_VIN_DECODER.decodeMercedesYear(cleanVIN, yearCode, plantCode);
      yearDebugInfo.method = 'Mercedes-Spezial';
      yearDebugInfo.result = year;
    } else {
      year = ENHANCED_VIN_DECODER.yearCodes[yearCode];
      yearDebugInfo.method = 'Standard';
      yearDebugInfo.result = year;
    }
    
    console.log('Jahr-Dekodierung Ergebnis:', yearDebugInfo);
    
    const vehicleAge = year ? new Date().getFullYear() - year : null;
    
    if (!manufacturer) {
      return { isValid: false, error: `Unbekannter Hersteller-Code: ${wmi}` };
    }

    // Motor-Dekodierung
    const engineInfo = ENHANCED_VIN_DECODER.decodeEngine(vds, manufacturer.make, year);
    
    // Modell-Dekodierung
    const modelInfo = ENHANCED_VIN_DECODER.decodeModel(vds, manufacturer.make);
    
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
        },
        'WAU': {
          '0': 'Ingolstadt', '1': 'Neckarsulm', '2': 'Győr', 
          '3': 'Brüssel', '4': 'Martorell', '5': 'San José'
        },
        'WVW': {
          '0': 'Wolfsburg', '1': 'Emden', '2': 'Kassel', 
          '3': 'Salzgitter', '4': 'Braunschweig', '5': 'Hannover'
        }
      };
      return plantMappings[wmi]?.[plantCode] || `Werk Code: ${plantCode}`;
    };

    // Erweiterte technische Spezifikationen
    const getEnhancedSpecs = () => {
      const specs = {
        emissionStandard: year >= 2017 ? 'Euro 6d-TEMP/6d' : year >= 2014 ? 'Euro 6' : year >= 2009 ? 'Euro 5' : 'Euro 4',
        registrationRequired: vehicleAge && vehicleAge >= 3,
        nextInspection: vehicleAge && vehicleAge >= 3 ? 'TÜV/AU alle 2 Jahre' : 'Erstmalig nach 3 Jahren'
      };

      // Wartungsintervalle basierend auf Motor und Hersteller
      if (engineInfo.fuel === 'Diesel') {
        specs.serviceInterval = 'Alle 15.000km oder 1 Jahr';
        specs.dpfInfo = 'Dieselpartikelfilter - Langstrecken empfohlen';
        specs.adBlueRequired = year >= 2015;
      } else if (engineInfo.fuel === 'Benzin') {
        specs.serviceInterval = 'Alle 15.000-20.000km oder 1-2 Jahre';
        if (engineInfo.turbo) {
          specs.oilType = 'Hochleistungsöl für Turbomotoren';
        }
      } else if (engineInfo.fuel === 'Elektro') {
        specs.serviceInterval = 'Alle 30.000km oder 2 Jahre';
        specs.batteryWarranty = '8 Jahre oder 160.000km';
      } else if (engineInfo.fuel === 'Hybrid') {
        specs.serviceInterval = 'Alle 15.000km oder 1 Jahr';
        specs.hybridBatteryWarranty = '8 Jahre oder 160.000km';
      }

      // Herstellerspezifische bekannte Probleme
      specs.commonIssues = ENHANCED_VIN_DECODER.getCommonIssues(manufacturer.make, engineInfo, year, vehicleAge);

      return specs;
    };

    return {
      vin: cleanVIN,
      isValid: true,
      segments: { wmi, vds, yearCode, plantCode, serialNumber },
      
      // Grunddaten
      make: manufacturer.make,
      country: manufacturer.country,
      vehicleType: manufacturer.type,
      
      // Modell-Information
      series: modelInfo.series,
      generation: modelInfo.generation,
      productionYears: modelInfo.productionYears,
      
      // Jahr und Alter
      year: year || 'Unbekannt',
      vehicleAge: vehicleAge,
      isClassic: vehicleAge && vehicleAge > 30,
      isModern: vehicleAge && vehicleAge < 3,
      
      // Motor-Informationen
      engine: engineInfo.engine,
      displacement: engineInfo.displacement,
      fuel: engineInfo.fuel,
      power: engineInfo.power,
      cylinders: engineInfo.cylinders,
      turbo: engineInfo.turbo,
      config: engineInfo.config,
      
      // Produktion
      assemblyPlant: getPlantInfo(),
      serialNumber: serialNumber,
      
      // Erweiterte technische Daten
      estimatedSpecs: getEnhancedSpecs(),
      
      // Vertrauenswerte
      confidence: engineInfo.confidence,
      
      // Debug-Informationen für Jahres-Dekodierung
      debugYear: {
        yearCode: yearCode,
        standardYear: ENHANCED_VIN_DECODER.yearCodes[yearCode],
        detectedYear: year,
        isMercedes: manufacturer.make === 'Mercedes-Benz',
        yearSource: manufacturer.make === 'Mercedes-Benz' ? 'Mercedes-Spezial' : 'Standard'
      }
    };
  },

  // Motor-Dekodierung
  decodeEngine: (vds, make, year) => {
    const engineCodes = ENHANCED_VIN_DECODER.engineCodes[make];
    if (!engineCodes) {
      return {
        engine: 'Unbekannt',
        displacement: 'Unbekannt',
        fuel: 'Unbekannt',
        power: 'Unbekannt',
        cylinders: 0,
        turbo: false,
        config: 'Unbekannt',
        confidence: 'Niedrig'
      };
    }

    // Suche nach Motor-Code im VDS
    for (const [code, engineData] of Object.entries(engineCodes)) {
      if (vds.includes(code)) {
        return {
          ...engineData,
          confidence: 'Hoch'
        };
      }
    }

    // Fallback: Pattern-basierte Erkennung
    return ENHANCED_VIN_DECODER.guessEngineFromPattern(vds, make, year);
  },

  // Modell-Dekodierung
  decodeModel: (vds, make) => {
    const modelCodes = ENHANCED_VIN_DECODER.modelCodes[make];
    if (!modelCodes) {
      return { series: null, generation: null, productionYears: null };
    }

    for (const [code, model] of Object.entries(modelCodes)) {
      if (vds.includes(code)) {
        return {
          series: model,
          generation: ENHANCED_VIN_DECODER.getGeneration(make, model),
          productionYears: ENHANCED_VIN_DECODER.getProductionYears(make, model)
        };
      }
    }

    return { series: null, generation: null, productionYears: null };
  },

  // Pattern-basierte Motor-Vermutung
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
        'E': { fuel: 'Benzin', turbo: true, config: 'CGI Turbo' },
        'H': { fuel: 'Diesel', turbo: true, config: 'CDI Diesel' },
        'Z': { fuel: 'Elektro', turbo: false, config: 'EQ Elektro' },
        'Y': { fuel: 'Hybrid', turbo: true, config: 'EQ Power Hybrid' }
      },
      'Audi': {
        'D': { fuel: 'Diesel', turbo: true, config: 'TDI Diesel' },
        'E': { fuel: 'Benzin', turbo: true, config: 'TFSI Turbo' },
        'F': { fuel: 'Benzin', turbo: false, config: 'FSI Saugmotor' },
        'Z': { fuel: 'Elektro', turbo: false, config: 'e-tron Elektro' },
        'Y': { fuel: 'Hybrid', turbo: true, config: 'TFSI e Hybrid' }
      },
      'Volkswagen': {
        'D': { fuel: 'Diesel', turbo: true, config: 'TDI Diesel' },
        'E': { fuel: 'Benzin', turbo: true, config: 'TSI Turbo' },
        'F': { fuel: 'Benzin', turbo: false, config: 'FSI Saugmotor' },
        'Z': { fuel: 'Elektro', turbo: false, config: 'ID. Elektro' },
        'Y': { fuel: 'Hybrid', turbo: true, config: 'TSI e-Hybrid' }
      },
      'Porsche': {
        'P': { fuel: 'Benzin', turbo: true, config: 'Turbo' },
        'S': { fuel: 'Benzin', turbo: false, config: 'Saugmotor' },
        'Z': { fuel: 'Elektro', turbo: false, config: 'Taycan Elektro' },
        'Y': { fuel: 'Hybrid', turbo: true, config: 'E-Hybrid' }
      }
    };

    const firstChar = vds.charAt(0);
    const pattern = patterns[make]?.[firstChar];

    if (pattern) {
      return {
        engine: `${pattern.fuel}-Motor`,
        displacement: 'Unbekannt',
        fuel: pattern.fuel,
        power: 'Unbekannt',
        cylinders: pattern.fuel === 'Elektro' ? 0 : 4,
        turbo: pattern.turbo,
        config: pattern.config,
        confidence: 'Mittel'
      };
    }

    return {
      engine: 'Unbekannt',
      displacement: 'Unbekannt',
      fuel: 'Unbekannt',
      power: 'Unbekannt',
      cylinders: 0,
      turbo: false,
      config: 'Unbekannt',
      confidence: 'Niedrig'
    };
  },

  // Generation ermitteln
  getGeneration: (make, model) => {
    const generations = {
      'BMW': {
        '1er': 'F40 (2019-heute)',
        '3er': 'G20/G21 (2019-heute)',
        '5er': 'G30/G31 (2017-heute)',
        '7er': 'G70 (2022-heute)',
        'X1': 'U11 (2022-heute)',
        'X3': 'G01 (2017-heute)',
        'X5': 'G05 (2018-heute)',
        'i4': 'G26 (2021-heute)',
        'iX': 'I20 (2021-heute)'
      },
      'Mercedes-Benz': {
        'A-Klasse': 'W177 (2018-heute)',
        'C-Klasse': 'W206 (2021-heute)',
        'E-Klasse': 'W214 (2023-heute)',
        'S-Klasse': 'W223 (2020-heute)',
        'GLA': 'H247 (2020-heute)',
        'GLC': 'X254 (2022-heute)',
        'EQS': 'V297 (2021-heute)',
        'EQE': 'V295 (2022-heute)'
      },
      'Audi': {
        'A3': '8Y (2020-heute)',
        'A4': 'B10 (2023-heute)',
        'A6': 'C9 (2024-heute)',
        'Q3': '8U (2018-heute)',
        'Q5': 'FY (2017-heute)',
        'e-tron': 'GE (2018-heute)',
        'e-tron GT': 'J1 (2021-heute)'
      },
      'Volkswagen': {
        'Golf': '8 (2019-heute)',
        'Passat': 'B9 (2022-heute)',
        'Tiguan': '5N (2016-heute)',
        'ID.3': 'E11 (2020-heute)',
        'ID.4': 'E21 (2021-heute)'
      },
      'Porsche': {
        '911': '992 (2019-heute)',
        'Cayenne': '9YA (2017-heute)',
        'Macan': '95B (2019-heute)',
        'Taycan': 'J1 (2019-heute)'
      }
    };

    return generations[make]?.[model] || null;
  },

  // Produktionsjahre ermitteln
  getProductionYears: (make, model) => {
    const productionYears = {
      'BMW': {
        '3er': '2019-heute',
        '5er': '2017-heute',
        'X3': '2017-heute',
        'i4': '2021-heute'
      },
      'Mercedes-Benz': {
        'C-Klasse': '2021-heute',
        'E-Klasse': '2023-heute',
        'GLC': '2022-heute',
        'EQS': '2021-heute'
      },
      'Audi': {
        'A3': '2020-heute',
        'Q5': '2017-heute',
        'e-tron': '2018-heute'
      },
      'Volkswagen': {
        'Golf': '2019-heute',
        'ID.3': '2020-heute',
        'ID.4': '2021-heute'
      },
      'Porsche': {
        '911': '2019-heute',
        'Taycan': '2019-heute'
      }
    };

    return productionYears[make]?.[model] || null;
  },

  // Bekannte Probleme basierend auf Hersteller, Motor und Alter
  getCommonIssues: (make, engineInfo, year, vehicleAge) => {
    const issues = [];

    // Allgemeine altersbedingte Probleme
    if (vehicleAge > 10) {
      issues.push('Verschleißteile (Bremsen, Fahrwerk) prüfen');
    }
    if (vehicleAge > 15) {
      issues.push('Elektronikprobleme möglich');
      issues.push('Rostprüfung empfohlen');
    }

    // Herstellerspezifische Probleme
    if (make === 'BMW') {
      if (engineInfo.fuel === 'Diesel') {
        issues.push('Wirbelklappen-Probleme ab 80.000km');
        issues.push('Einspritzsystem-Verkokung möglich');
        if (engineInfo.engine && engineInfo.engine.includes('N47')) {
          issues.push('Steuerkette N47-Motor prüfen');
        }
      }
      if (engineInfo.turbo) {
        issues.push('Ladeluftkühler prüfen ab 100.000km');
      }
      if (year >= 2010 && year <= 2016) {
        issues.push('Steuerkette (N20/N26 Motoren) prüfen');
      }
      if (engineInfo.engine && engineInfo.engine.includes('N63')) {
        issues.push('V8 N63 - Turbolader und Injektoren überwachen');
      }
    }

    if (make === 'Mercedes-Benz') {
      if (engineInfo.fuel === 'Diesel') {
        issues.push('AdBlue-System regelmäßig prüfen');
        issues.push('DPF-Regeneration beachten');
        if (engineInfo.engine && engineInfo.engine.includes('OM642')) {
          issues.push('OM642 - Wirbelklappen und Ölleckagen prüfen');
        }
      }
      if (year >= 2014 && year <= 2019) {
        issues.push('Luftfederung (bei Ausstattung) prüfen');
      }
      if (engineInfo.engine && engineInfo.engine.includes('M274')) {
        issues.push('M274 - Ausgleichswellen-Lagerung überwachen');
      }
    }

    if (make === 'Audi') {
      if (engineInfo.engine && engineInfo.engine.includes('TFSI')) {
        issues.push('Ölverbrauch bei TFSI-Motoren überwachen');
        issues.push('Steuerkette ab 120.000km prüfen');
      }
      if (engineInfo.fuel === 'Diesel') {
        issues.push('DPF-Probleme bei Kurzstrecken');
        if (engineInfo.engine && engineInfo.engine.includes('3.0 TDI')) {
          issues.push('3.0 TDI - Thermostat und Wasserpumpe prüfen');
        }
      }
      if (year >= 2008 && year <= 2015) {
        issues.push('MMI-System Updates prüfen');
      }
    }

    if (make === 'Volkswagen') {
      if (year >= 2008 && year <= 2015 && engineInfo.fuel === 'Diesel') {
        issues.push('Dieselgate-Betroffenheit prüfen');
      }
      if (engineInfo.engine && engineInfo.engine.includes('TSI')) {
        issues.push('Wasserpumpe ab 80.000km prüfen');
        if (engineInfo.engine.includes('1.4 TSI')) {
          issues.push('1.4 TSI - Steuerkette und Spannschiene überwachen');
        }
      }
      if (engineInfo.fuel === 'Diesel' && engineInfo.engine && engineInfo.engine.includes('TDI')) {
        issues.push('DPF-Regenerationszyklen beachten');
      }
    }

    if (make === 'Porsche') {
      if (engineInfo.engine && engineInfo.engine.includes('2.5')) {
        issues.push('Intermediate Shaft Bearing (IMS) prüfen');
      }
      if (engineInfo.fuel === 'Elektro') {
        issues.push('Hochvolt-Batterie regelmäßig prüfen lassen');
      }
      if (year >= 2010 && year <= 2016) {
        issues.push('PCM-Softwareupdates verfügbar');
      }
    }

    return issues.length > 0 ? issues : null;
  }
};

export default ENHANCED_VIN_DECODER;