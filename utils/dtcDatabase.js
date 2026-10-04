// Fehlercode-Datenbank (generische SAE-J2012-Codes, deutsche Beschreibungen).
// Ursachen und Symptome sind allgemeine Erfahrungswerte – herstellerspezifische Angaben gehen vor.

const DTC_DATABASE = {};

const add = (code, description, severity, category, commonCauses, symptoms) => {
  DTC_DATABASE[code] = { description, severity, category, commonCauses, symptoms };
};

// --- Gemeinsame Ursachen-/Symptomlisten -----------------------------------
const SENSOR_CAUSES = ['Defekter Sensor', 'Kabelbruch oder Kurzschluss in der Leitung', 'Korrodierter oder lockerer Stecker', 'Defektes Steuergerät (selten)'];
const SENSOR_SYMPTOMS = ['Motorkontrollleuchte', 'Unrunder Lauf oder Leistungsverlust', 'Erhöhter Kraftstoffverbrauch'];
const ACTUATOR_CAUSES = ['Defektes Stellglied/Ventil', 'Kabelbruch oder Kurzschluss in der Leitung', 'Korrodierter oder lockerer Stecker', 'Defekte Sicherung oder defektes Relais'];
const MISFIRE_CAUSES = ['Defekte Zündkerze', 'Defekte Zündspule', 'Niedriger Kompressionsdruck', 'Verstopfte oder defekte Einspritzdüse', 'Falschluft'];
const MISFIRE_SYMPTOMS = ['Motor ruckelt', 'Leistungsverlust', 'Unrunder Leerlauf', 'Erhöhte Emissionen', 'Blinkende Motorkontrollleuchte'];
const COMM_CAUSES = ['Niedrige Batteriespannung', 'Fehlerhafte Masse- oder Stromversorgung', 'Defekte CAN-Bus-Verkabelung', 'Defektes Steuergerät'];
const COMM_SYMPTOMS = ['Mehrere Warnleuchten', 'Ausfall einzelner Funktionen', 'Diagnosegerät erreicht Steuergerät nicht'];

// --- Zündaussetzer ---------------------------------------------------------
add('P0300', 'Zufällige/mehrfache Zündaussetzer erkannt', 'Hoch', 'Zündsystem',
  ['Falschluft', 'Zu geringer Kraftstoffdruck', 'Verschlissene Zündkerzen', 'Defekte Zündspulen', 'Kompressionsverlust'], MISFIRE_SYMPTOMS);
for (let i = 1; i <= 12; i++) {
  add(`P03${String(i).padStart(2, '0')}`, `Zündaussetzer Zylinder ${i}`, 'Hoch', 'Zündsystem', MISFIRE_CAUSES, MISFIRE_SYMPTOMS);
}

// --- Einspritzventile ------------------------------------------------------
for (let i = 1; i <= 12; i++) {
  add(`P02${String(i).padStart(2, '0')}`, `Einspritzventil Zylinder ${i}: Stromkreis`, 'Mittel', 'Kraftstoffsystem',
    ['Defektes Einspritzventil', 'Kabelbruch oder Kurzschluss in der Leitung', 'Korrodierter Stecker', 'Defektes Steuergerät (selten)'],
    ['Motor ruckelt', 'Zündaussetzer', 'Leistungsverlust']);
}

// --- Lambdasonden ----------------------------------------------------------
const O2_POSITIONS = [
  { base: 130, label: 'Bank 1 Sonde 1 (vor Kat)' },
  { base: 136, label: 'Bank 1 Sonde 2 (nach Kat)' },
  { base: 150, label: 'Bank 2 Sonde 1 (vor Kat)' },
  { base: 156, label: 'Bank 2 Sonde 2 (nach Kat)' }
];
const O2_TYPES = ['Stromkreis', 'Signal zu niedrig', 'Signal zu hoch', 'Zu langsame Reaktion', 'Keine Aktivität erkannt', 'Heizungsstromkreis'];
for (const { base, label } of O2_POSITIONS) {
  O2_TYPES.forEach((type, i) => {
    const heater = i === 5;
    add(`P0${base + i}`, `Lambdasonde ${label}: ${type}`, 'Mittel', 'Abgassystem',
      heater
        ? ['Defekte Sondenheizung', 'Defekte Sicherung', 'Kabelbruch oder Kurzschluss in der Leitung']
        : ['Gealterte oder defekte Lambdasonde', 'Undichtigkeit in der Abgasanlage', 'Falschluft', 'Kabel- oder Steckerschaden'],
      ['Motorkontrollleuchte', 'Erhöhter Kraftstoffverbrauch', 'Erhöhte Abgaswerte']);
  });
}

// --- Luftmasse, Saugrohrdruck, Temperatur, Drosselklappe -------------------
const AIR = [
  ['P0100', 'Luftmassenmesser: Stromkreis'],
  ['P0101', 'Luftmassenmesser: Messwert unplausibel'],
  ['P0102', 'Luftmassenmesser: Signal zu niedrig'],
  ['P0103', 'Luftmassenmesser: Signal zu hoch'],
  ['P0104', 'Luftmassenmesser: Wackelkontakt'],
  ['P0105', 'Saugrohrdrucksensor: Stromkreis'],
  ['P0106', 'Saugrohrdrucksensor: Messwert unplausibel'],
  ['P0107', 'Saugrohrdrucksensor: Signal zu niedrig'],
  ['P0108', 'Saugrohrdrucksensor: Signal zu hoch'],
  ['P0110', 'Ansauglufttemperatursensor: Stromkreis'],
  ['P0111', 'Ansauglufttemperatursensor: Messwert unplausibel'],
  ['P0112', 'Ansauglufttemperatursensor: Signal zu niedrig'],
  ['P0113', 'Ansauglufttemperatursensor: Signal zu hoch'],
  ['P0115', 'Kühlmitteltemperatursensor: Stromkreis'],
  ['P0116', 'Kühlmitteltemperatursensor: Messwert unplausibel'],
  ['P0117', 'Kühlmitteltemperatursensor: Signal zu niedrig'],
  ['P0118', 'Kühlmitteltemperatursensor: Signal zu hoch'],
  ['P0120', 'Drosselklappen-/Pedalsensor A: Stromkreis'],
  ['P0121', 'Drosselklappen-/Pedalsensor A: Messwert unplausibel'],
  ['P0122', 'Drosselklappen-/Pedalsensor A: Signal zu niedrig'],
  ['P0123', 'Drosselklappen-/Pedalsensor A: Signal zu hoch'],
  ['P0220', 'Drosselklappen-/Pedalsensor B: Stromkreis'],
  ['P0222', 'Drosselklappen-/Pedalsensor B: Signal zu niedrig'],
  ['P0223', 'Drosselklappen-/Pedalsensor B: Signal zu hoch'],
  ['P0190', 'Kraftstoffdrucksensor (Rail): Stromkreis'],
  ['P0191', 'Kraftstoffdrucksensor (Rail): Messwert unplausibel'],
  ['P0192', 'Kraftstoffdrucksensor (Rail): Signal zu niedrig'],
  ['P0193', 'Kraftstoffdrucksensor (Rail): Signal zu hoch'],
  ['P0180', 'Kraftstofftemperatursensor: Stromkreis'],
  ['P0182', 'Kraftstofftemperatursensor: Signal zu niedrig'],
  ['P0183', 'Kraftstofftemperatursensor: Signal zu hoch'],
  ['P0520', 'Öldrucksensor: Stromkreis'],
  ['P0522', 'Öldrucksensor: Signal zu niedrig'],
  ['P0523', 'Öldrucksensor: Signal zu hoch'],
  ['P0500', 'Geschwindigkeitssensor: Stromkreis'],
  ['P0501', 'Geschwindigkeitssensor: Messwert unplausibel']
];
for (const [code, description] of AIR) add(code, description, 'Mittel', 'Sensorik', SENSOR_CAUSES, SENSOR_SYMPTOMS);

// --- Gemisch, Kühlung, Leerlauf -------------------------------------------
add('P0125', 'Kühlmitteltemperatur zu niedrig für geschlossenen Regelkreis', 'Niedrig', 'Kühlsystem',
  ['Defekter Thermostat (bleibt offen)', 'Defekter Kühlmitteltemperatursensor', 'Niedriger Kühlmittelstand'],
  ['Lange Warmlaufzeit', 'Erhöhter Kraftstoffverbrauch', 'Heizung wird kaum warm']);
add('P0128', 'Kühlmitteltemperatur zu niedrig (Thermostat)', 'Niedrig', 'Kühlsystem',
  ['Defekter Thermostat', 'Niedriger Kühlmittelstand', 'Defekter Temperatursensor'],
  ['Verlängerte Warmlaufzeit', 'Heizung funktioniert schlecht', 'Erhöhter Kraftstoffverbrauch']);
add('P0217', 'Motor überhitzt', 'Kritisch', 'Kühlsystem',
  ['Zu wenig Kühlmittel', 'Defekter Thermostat', 'Defekter Lüfter', 'Defekte Wasserpumpe', 'Zylinderkopfdichtung'],
  ['Temperaturanzeige im roten Bereich', 'Kühlmittelverlust', 'Dampf aus dem Motorraum']);
add('P0480', 'Lüfter 1: Stromkreis der Ansteuerung', 'Mittel', 'Kühlsystem', ACTUATOR_CAUSES, ['Motor wird zu heiß', 'Lüfter läuft nicht oder dauerhaft']);
add('P0481', 'Lüfter 2: Stromkreis der Ansteuerung', 'Mittel', 'Kühlsystem', ACTUATOR_CAUSES, ['Motor wird zu heiß', 'Klimaanlage kühlt schlecht im Stand']);

add('P0170', 'Gemischregelung Bank 1: Fehlfunktion', 'Mittel', 'Kraftstoffsystem',
  ['Falschluft', 'Defekter Luftmassenmesser', 'Kraftstoffdruck falsch', 'Defekte Lambdasonde'], ['Unrunder Leerlauf', 'Erhöhter Verbrauch']);
add('P0171', 'System zu mager (Bank 1)', 'Mittel', 'Kraftstoffsystem',
  ['Undichtigkeit im Ansaugsystem (Falschluft)', 'Verschmutzter Luftmassenmesser', 'Schwache Kraftstoffpumpe oder verstopfter Filter', 'Defekte Lambdasonde'],
  ['Unrunder Leerlauf', 'Schlechte Beschleunigung', 'Erhöhter Kraftstoffverbrauch']);
add('P0172', 'System zu fett (Bank 1)', 'Mittel', 'Kraftstoffsystem',
  ['Verschmutzter Luftmassenmesser', 'Undichte Einspritzventile', 'Zu hoher Kraftstoffdruck', 'Defekte Lambdasonde', 'Verstopfter Luftfilter'],
  ['Schwarzer Rauch', 'Kraftstoffgeruch', 'Erhöhter Kraftstoffverbrauch']);
add('P0173', 'Gemischregelung Bank 2: Fehlfunktion', 'Mittel', 'Kraftstoffsystem',
  ['Falschluft', 'Defekter Luftmassenmesser', 'Kraftstoffdruck falsch', 'Defekte Lambdasonde'], ['Unrunder Leerlauf', 'Erhöhter Verbrauch']);
add('P0174', 'System zu mager (Bank 2)', 'Mittel', 'Kraftstoffsystem',
  ['Undichtigkeit im Ansaugsystem (Falschluft)', 'Verschmutzter Luftmassenmesser', 'Schwache Kraftstoffpumpe', 'Defekte Lambdasonde Bank 2'],
  ['Unrunder Leerlauf', 'Schlechte Beschleunigung', 'Erhöhter Kraftstoffverbrauch']);
add('P0175', 'System zu fett (Bank 2)', 'Mittel', 'Kraftstoffsystem',
  ['Verschmutzter Luftmassenmesser', 'Undichte Einspritzventile', 'Zu hoher Kraftstoffdruck', 'Defekte Lambdasonde Bank 2'],
  ['Schwarzer Rauch', 'Kraftstoffgeruch', 'Erhöhter Kraftstoffverbrauch']);
add('P0087', 'Kraftstoffdruck (Rail) zu niedrig', 'Hoch', 'Kraftstoffsystem',
  ['Verstopfter Kraftstofffilter', 'Schwache Kraftstoff-/Hochdruckpumpe', 'Defekter Druckregler', 'Undichtigkeit in der Kraftstoffleitung'],
  ['Leistungsverlust', 'Startprobleme', 'Notlauf', 'Motor geht aus']);
add('P0088', 'Kraftstoffdruck (Rail) zu hoch', 'Hoch', 'Kraftstoffsystem',
  ['Defekter Druckregler', 'Defekter Drucksensor', 'Verstopfte Rücklaufleitung'], ['Unrunder Lauf', 'Notlauf', 'Motorkontrollleuchte']);
add('P0089', 'Kraftstoffdruckregler: Leistung unplausibel', 'Hoch', 'Kraftstoffsystem',
  ['Defekter Druckregler', 'Defekte Hochdruckpumpe', 'Verstopfter Kraftstofffilter'], ['Leistungsverlust', 'Notlauf']);
add('P0230', 'Kraftstoffpumpe: Stromkreis der Ansteuerung', 'Hoch', 'Kraftstoffsystem',
  ['Defekte Kraftstoffpumpe', 'Defektes Pumpenrelais', 'Defekte Sicherung', 'Kabelbruch'], ['Motor startet nicht', 'Motor geht während der Fahrt aus']);
add('P0627', 'Kraftstoffpumpe: Ansteuerung offener Stromkreis', 'Hoch', 'Kraftstoffsystem',
  ['Defekte Kraftstoffpumpe', 'Defektes Relais', 'Kabelbruch'], ['Motor startet nicht', 'Motor geht aus']);

add('P0505', 'Leerlaufregelung: Fehlfunktion', 'Mittel', 'Motorsteuerung',
  ['Verschmutzte Drosselklappe', 'Defekter Leerlaufsteller', 'Falschluft'], ['Schwankende Leerlaufdrehzahl', 'Motor geht im Leerlauf aus']);
add('P0506', 'Leerlaufdrehzahl zu niedrig', 'Mittel', 'Motorsteuerung',
  ['Verschmutzter Leerlaufsteller oder Drosselklappe', 'Ansaugluftleck', 'Defekter Leerlaufregler'], ['Niedriger Leerlauf', 'Motor geht aus', 'Unrunder Leerlauf']);
add('P0507', 'Leerlaufdrehzahl zu hoch', 'Mittel', 'Motorsteuerung',
  ['Defekter Leerlaufsteller', 'Falschluft im Ansaugsystem', 'Drosselklappe klemmt'], ['Hoher Leerlauf', 'Erhöhter Kraftstoffverbrauch', 'Unrunder Motor']);

// --- Nockenwelle, Kurbelwelle, Klopfsensor ---------------------------------
add('P0010', 'Nockenwellenverstellung A Bank 1: Stromkreis', 'Mittel', 'Motorsteuerung',
  ['Defektes Nockenwellenverstellventil', 'Kabelbruch oder Kurzschluss', 'Verschmutztes Motoröl'], ['Leistungsverlust', 'Unrunder Leerlauf']);
add('P0011', 'Nockenwellenverstellung A Bank 1: zu weit vorgestellt', 'Mittel', 'Motorsteuerung',
  ['Zu niedriger oder verschmutzter Ölstand', 'Defektes Verstellventil', 'Längung der Steuerkette', 'Defekter Verstellsteller'], ['Unrunder Leerlauf', 'Leistungsverlust', 'Klappergeräusche']);
add('P0012', 'Nockenwellenverstellung A Bank 1: zu weit nachgestellt', 'Mittel', 'Motorsteuerung',
  ['Zu niedriger oder verschmutzter Ölstand', 'Defektes Verstellventil', 'Längung der Steuerkette', 'Defekter Verstellsteller'], ['Unrunder Leerlauf', 'Leistungsverlust', 'Klappergeräusche']);
add('P0016', 'Kurbelwelle/Nockenwelle Bank 1: Stellung unplausibel', 'Hoch', 'Motorsteuerung',
  ['Gelängte Steuerkette bzw. Steuerriemen übersprungen', 'Defekter Nockenwellen- oder Kurbelwellensensor', 'Defekter Nockenwellenversteller'], ['Motor startet schlecht', 'Unrunder Lauf', 'Notlauf']);
add('P0335', 'Kurbelwellensensor: Stromkreis', 'Hoch', 'Sensorik',
  ['Defekter Kurbelwellensensor', 'Kabel- oder Steckerschaden', 'Beschädigtes Geberrad'], ['Motor startet nicht', 'Motor geht während der Fahrt aus', 'Drehzahlmesser fällt aus']);
add('P0336', 'Kurbelwellensensor: Messwert unplausibel', 'Hoch', 'Sensorik',
  ['Defekter Kurbelwellensensor', 'Beschädigtes Geberrad', 'Falscher Luftspalt', 'Kabel- oder Steckerschaden'], ['Unrunder Lauf', 'Motor geht aus', 'Startprobleme']);
add('P0337', 'Kurbelwellensensor: Signal zu niedrig', 'Hoch', 'Sensorik', SENSOR_CAUSES, ['Startprobleme', 'Motor geht aus']);
add('P0338', 'Kurbelwellensensor: Signal zu hoch', 'Hoch', 'Sensorik', SENSOR_CAUSES, ['Startprobleme', 'Motor geht aus']);
add('P0340', 'Nockenwellensensor: Stromkreis', 'Mittel', 'Sensorik',
  ['Defekter Nockenwellensensor', 'Kabel- oder Steckerschaden', 'Falsche Steuerzeiten'], ['Startprobleme', 'Leistungsverlust', 'Notlauf']);
add('P0341', 'Nockenwellensensor: Messwert unplausibel', 'Mittel', 'Sensorik',
  ['Defekter Nockenwellensensor', 'Falsche Steuerzeiten', 'Beschädigtes Geberrad'], ['Startprobleme', 'Unrunder Lauf']);
add('P0342', 'Nockenwellensensor: Signal zu niedrig', 'Mittel', 'Sensorik', SENSOR_CAUSES, ['Startprobleme', 'Leistungsverlust']);
add('P0343', 'Nockenwellensensor: Signal zu hoch', 'Mittel', 'Sensorik', SENSOR_CAUSES, ['Startprobleme', 'Leistungsverlust']);
add('P0325', 'Klopfsensor 1: Stromkreis', 'Mittel', 'Sensorik',
  ['Defekter Klopfsensor', 'Lockere Befestigung', 'Kabel- oder Steckerschaden'], ['Leistungsverlust', 'Klopfen bei Last', 'Erhöhter Verbrauch']);
add('P0326', 'Klopfsensor 1: Messwert unplausibel', 'Mittel', 'Sensorik',
  ['Defekter Klopfsensor', 'Mechanische Motorgeräusche', 'Falsches Anzugsmoment des Sensors'], ['Leistungsverlust', 'Klopfen bei Last']);
add('P0327', 'Klopfsensor 1: Signal zu niedrig', 'Mittel', 'Sensorik', SENSOR_CAUSES, ['Leistungsverlust', 'Erhöhter Verbrauch']);
add('P0328', 'Klopfsensor 1: Signal zu hoch', 'Mittel', 'Sensorik', SENSOR_CAUSES, ['Leistungsverlust', 'Erhöhter Verbrauch']);

// Zündspulen A–L (P0351–P0362)
'ABCDEFGHIJKL'.split('').forEach((letter, i) => {
  add(`P0${351 + i}`, `Zündspule ${letter}: Primär-/Sekundärkreis`, 'Hoch', 'Zündsystem',
    ['Defekte Zündspule', 'Kabelbruch oder Kurzschluss in der Leitung', 'Korrodierter Stecker', 'Defektes Zündmodul'],
    ['Motor ruckelt', 'Zündaussetzer', 'Leistungsverlust']);
});

// --- Diesel: Glühanlage ----------------------------------------------------
add('P0380', 'Glühkerzen-/Heizstromkreis A', 'Mittel', 'Glühanlage',
  ['Defekte Glühkerzen', 'Defektes Glühsteuergerät', 'Defekte Sicherung', 'Kabelbruch'], ['Startprobleme bei Kälte', 'Weißer Rauch beim Kaltstart', 'Rauer Lauf nach dem Start']);
add('P0381', 'Glühkontrollleuchte: Stromkreis', 'Niedrig', 'Glühanlage', ['Defekte Kontrollleuchte', 'Kabelbruch', 'Defektes Kombiinstrument'], ['Glühkontrollleuchte ohne Funktion']);
add('P0670', 'Glühkerzen-Steuergerät: Stromkreis', 'Mittel', 'Glühanlage',
  ['Defektes Glühsteuergerät', 'Defekte Sicherung', 'Korrodierter Stecker'], ['Startprobleme bei Kälte', 'Weißer Rauch beim Kaltstart']);
for (let i = 1; i <= 4; i++) {
  add(`P067${i}`, `Glühkerze Zylinder ${i}: Stromkreis`, 'Mittel', 'Glühanlage',
    ['Defekte Glühkerze', 'Kabelbruch oder Kurzschluss', 'Defektes Glühsteuergerät'], ['Startprobleme bei Kälte', 'Rauer Lauf nach dem Kaltstart']);
}

// --- Aufladung (Turbo) -----------------------------------------------------
add('P0234', 'Ladedruck zu hoch (Überladung)', 'Hoch', 'Aufladung',
  ['Klemmendes Wastegate / klemmende Turbinengeometrie', 'Defekter Ladedrucksteller', 'Defekter Ladedrucksensor', 'Unterdruckschlauch abgefallen'], ['Notlauf', 'Leistungsverlust', 'Pfeifgeräusche']);
add('P0235', 'Ladedrucksensor A: Stromkreis', 'Mittel', 'Aufladung', SENSOR_CAUSES, ['Notlauf', 'Leistungsverlust']);
add('P0236', 'Ladedrucksensor A: Messwert unplausibel', 'Mittel', 'Aufladung',
  ['Defekter Ladedrucksensor', 'Undichte Ladeluftstrecke', 'Verstopfter Luftfilter'], ['Leistungsverlust', 'Notlauf']);
add('P0237', 'Ladedrucksensor A: Signal zu niedrig', 'Mittel', 'Aufladung', SENSOR_CAUSES, ['Notlauf', 'Leistungsverlust']);
add('P0238', 'Ladedrucksensor A: Signal zu hoch', 'Mittel', 'Aufladung', SENSOR_CAUSES, ['Notlauf', 'Leistungsverlust']);
add('P0243', 'Ladedrucksteller (Wastegate) A: Stromkreis', 'Mittel', 'Aufladung', ACTUATOR_CAUSES, ['Notlauf', 'Leistungsverlust']);
add('P0245', 'Ladedrucksteller (Wastegate) A: Signal zu niedrig', 'Mittel', 'Aufladung', ACTUATOR_CAUSES, ['Notlauf', 'Leistungsverlust']);
add('P0246', 'Ladedrucksteller (Wastegate) A: Signal zu hoch', 'Mittel', 'Aufladung', ACTUATOR_CAUSES, ['Notlauf', 'Leistungsverlust']);
add('P0299', 'Ladedruck zu niedrig (Unterladung)', 'Hoch', 'Aufladung',
  ['Undichte Ladeluftstrecke', 'Defekter Ladedrucksteller', 'Defekter Turbolader', 'Verstopfter Partikelfilter/Katalysator', 'Unterdruckschlauch undicht'],
  ['Deutlicher Leistungsverlust', 'Notlauf', 'Pfeifgeräusche', 'Schwarzer Rauch']);
add('P2263', 'Turbolader/Aufladung: Leistung unplausibel', 'Hoch', 'Aufladung',
  ['Undichte Ladeluftstrecke', 'Defekter Turbolader', 'Defekter Ladedrucksteller'], ['Leistungsverlust', 'Notlauf']);
add('P2279', 'Ansaugsystem: Undichtigkeit', 'Mittel', 'Aufladung',
  ['Undichter Ansaug- oder Ladeluftschlauch', 'Lockere Schlauchschellen', 'Defekte Dichtungen'], ['Leistungsverlust', 'Pfeifgeräusche', 'Unrunder Leerlauf']);

// --- Abgasrückführung, Abgasnachbehandlung --------------------------------
add('P0400', 'Abgasrückführung: Fehlfunktion', 'Mittel', 'Abgassystem',
  ['Verkokstes AGR-Ventil', 'Defekter AGR-Sensor', 'Unterdruckleitung undicht'], ['Unrunder Leerlauf', 'Erhöhte Stickoxide', 'Leistungsverlust']);
add('P0401', 'Abgasrückführung: Durchfluss zu gering', 'Mittel', 'Abgassystem',
  ['Verkokstes oder klemmendes AGR-Ventil', 'Verstopfte AGR-Leitung', 'Defekter AGR-Sensor'], ['Klopfen', 'Leistungsverlust', 'Erhöhte Emissionen']);
add('P0402', 'Abgasrückführung: Durchfluss zu hoch', 'Mittel', 'Abgassystem',
  ['AGR-Ventil klemmt offen', 'Defekter AGR-Positionssensor', 'Unterdruckleck'], ['Unrunder Leerlauf', 'Motor geht aus', 'Schlechte Beschleunigung']);
add('P0403', 'Abgasrückführung: Stromkreis des Stellers', 'Mittel', 'Abgassystem', ACTUATOR_CAUSES, ['Unrunder Leerlauf', 'Leistungsverlust']);
add('P0404', 'Abgasrückführung: Messwert unplausibel', 'Mittel', 'Abgassystem',
  ['Verkokstes AGR-Ventil', 'Defekter AGR-Positionssensor', 'Verstopfte Leitungen'], ['Unrunder Leerlauf', 'Leistungsverlust']);
add('P0410', 'Sekundärluftsystem: Fehlfunktion', 'Niedrig', 'Abgassystem',
  ['Defekte Sekundärluftpumpe', 'Defektes Sekundärluftventil', 'Verstopfte Leitungen'], ['Erhöhte Abgaswerte im Kaltstart', 'Motorkontrollleuchte']);
add('P0411', 'Sekundärluftsystem: falscher Durchfluss', 'Niedrig', 'Abgassystem',
  ['Defekte Sekundärluftpumpe', 'Defektes Sekundärluftventil', 'Verstopfte oder undichte Leitungen'], ['Erhöhte Abgaswerte', 'Motorkontrollleuchte']);
add('P0420', 'Katalysator: Wirkungsgrad zu gering (Bank 1)', 'Mittel', 'Abgassystem',
  ['Gealterter oder defekter Katalysator', 'Defekte Lambdasonde nach Kat', 'Undichte Abgasanlage', 'Folge von Zündaussetzern oder Gemischfehlern'],
  ['Reduzierte Abgasreinigung', 'Möglicher HU-Mangel', 'Gelbe Motorkontrollleuchte']);
add('P0421', 'Katalysator: Wirkungsgrad beim Warmlauf zu gering (Bank 1)', 'Mittel', 'Abgassystem',
  ['Gealterter Katalysator', 'Defekte Lambdasonde', 'Undichte Abgasanlage'], ['Erhöhte Abgaswerte', 'Motorkontrollleuchte']);
add('P0430', 'Katalysator: Wirkungsgrad zu gering (Bank 2)', 'Mittel', 'Abgassystem',
  ['Gealterter oder defekter Katalysator Bank 2', 'Defekte Lambdasonde nach Kat', 'Undichte Abgasanlage', 'Folge von Zündaussetzern oder Gemischfehlern'],
  ['Reduzierte Abgasreinigung', 'Möglicher HU-Mangel', 'Gelbe Motorkontrollleuchte']);
add('P0431', 'Katalysator: Wirkungsgrad beim Warmlauf zu gering (Bank 2)', 'Mittel', 'Abgassystem',
  ['Gealterter Katalysator Bank 2', 'Defekte Lambdasonde', 'Undichte Abgasanlage'], ['Erhöhte Abgaswerte', 'Motorkontrollleuchte']);
add('P2002', 'Partikelfilter: Wirkungsgrad unter Grenzwert (Bank 1)', 'Hoch', 'Abgassystem',
  ['Beschädigter oder ausgeschmolzener Partikelfilter', 'Defekter Differenzdrucksensor', 'Undichte Abgasanlage'], ['Motorkontrollleuchte', 'Erhöhte Rußemissionen']);
add('P2452', 'Partikelfilter Differenzdrucksensor: Stromkreis', 'Mittel', 'Abgassystem', SENSOR_CAUSES, ['Motorkontrollleuchte', 'Fehlerhafte Regeneration']);
add('P2453', 'Partikelfilter Differenzdrucksensor: Messwert unplausibel', 'Mittel', 'Abgassystem',
  ['Verstopfte Druckschläuche', 'Defekter Differenzdrucksensor', 'Verstopfter Partikelfilter'], ['Motorkontrollleuchte', 'Leistungsverlust']);
add('P2096', 'Gemischregelung nach Katalysator zu mager (Bank 1)', 'Mittel', 'Abgassystem',
  ['Defekte Lambdasonde nach Kat', 'Undichte Abgasanlage', 'Gemischfehler'], ['Motorkontrollleuchte', 'Erhöhte Abgaswerte']);
add('P2097', 'Gemischregelung nach Katalysator zu fett (Bank 1)', 'Mittel', 'Abgassystem',
  ['Defekte Lambdasonde nach Kat', 'Gemischfehler'], ['Motorkontrollleuchte', 'Erhöhte Abgaswerte']);

// --- Tankentlüftung (EVAP) -------------------------------------------------
add('P0440', 'Tankentlüftungssystem: Fehlfunktion', 'Niedrig', 'Tankentlüftung',
  ['Defekte Tankdeckeldichtung', 'Undichtigkeit in Leitungen', 'Defektes Tankentlüftungsventil'], ['Kraftstoffgeruch', 'Schwierigkeiten beim Tanken', 'Motorkontrollleuchte']);
add('P0441', 'Tankentlüftung: falscher Spülstrom', 'Niedrig', 'Tankentlüftung',
  ['Defektes Tankentlüftungsventil', 'Verstopfte oder undichte Leitungen', 'Aktivkohlebehälter defekt'], ['Motorkontrollleuchte', 'Unrunder Leerlauf nach dem Tanken']);
add('P0442', 'Tankentlüftung: kleines Leck erkannt', 'Niedrig', 'Tankentlüftung',
  ['Tankdeckel undicht oder nicht fest', 'Undichter Schlauch oder Anschluss', 'Defektes Entlüftungsventil'], ['Motorkontrollleuchte', 'Leichter Kraftstoffgeruch']);
add('P0443', 'Tankentlüftungsventil: Stromkreis', 'Niedrig', 'Tankentlüftung', ACTUATOR_CAUSES, ['Motorkontrollleuchte', 'Unrunder Leerlauf']);
add('P0446', 'Tankentlüftung Belüftungsventil: Stromkreis/Funktion', 'Niedrig', 'Tankentlüftung',
  ['Verstopfte Entlüftungsleitung', 'Defektes Belüftungsventil', 'Verschmutzung oder Insekten im System'], ['Schwierigkeiten beim Tanken', 'Kraftstoffgeruch', 'Motorkontrollleuchte']);
add('P0455', 'Tankentlüftung: großes Leck erkannt', 'Niedrig', 'Tankentlüftung',
  ['Tankdeckel fehlt oder sitzt nicht fest', 'Abgerissener oder undichter Schlauch', 'Defekter Aktivkohlebehälter'], ['Motorkontrollleuchte', 'Kraftstoffgeruch']);
add('P0456', 'Tankentlüftung: sehr kleines Leck erkannt', 'Niedrig', 'Tankentlüftung',
  ['Tankdeckeldichtung porös', 'Kleine Undichtigkeit in Leitung oder Ventil'], ['Motorkontrollleuchte']);
add('P0457', 'Tankentlüftung: Leck (Tankdeckel lose oder fehlt)', 'Niedrig', 'Tankentlüftung',
  ['Tankdeckel lose, fehlt oder undicht'], ['Motorkontrollleuchte']);

// --- Spannungsversorgung, Steuergerät --------------------------------------
add('P0560', 'Systemspannung: Fehlfunktion', 'Mittel', 'Elektrik',
  ['Schwache Batterie', 'Defekte Lichtmaschine', 'Korrodierte Pole oder Masseverbindungen'], ['Warnleuchten', 'Startprobleme', 'Flackerndes Licht']);
add('P0562', 'Systemspannung zu niedrig', 'Mittel', 'Elektrik',
  ['Schwache Batterie', 'Defekte Lichtmaschine oder Regler', 'Lockerer Keilrippenriemen', 'Korrodierte Pole oder Masseverbindungen'], ['Batteriewarnleuchte', 'Startprobleme', 'Elektrikfehler']);
add('P0563', 'Systemspannung zu hoch', 'Mittel', 'Elektrik',
  ['Defekter Lichtmaschinenregler', 'Fehlerhafte Batterie', 'Fehlerhafte Verkabelung'], ['Batteriewarnleuchte', 'Überspannungsschäden', 'Zu helle Beleuchtung']);
add('P0571', 'Bremslichtschalter: Stromkreis', 'Niedrig', 'Elektrik',
  ['Defekter Bremslichtschalter', 'Falsch eingestellter Schalter', 'Kabelbruch'], ['Bremslicht funktioniert nicht', 'Tempomat ohne Funktion']);
add('P0600', 'Serielle Kommunikation zwischen Steuergeräten', 'Hoch', 'Steuergerät', COMM_CAUSES, COMM_SYMPTOMS);
add('P0601', 'Steuergerät: interner Speicherfehler (Prüfsumme)', 'Hoch', 'Steuergerät',
  ['Defektes Motorsteuergerät', 'Fehlerhafte Programmierung/Software', 'Spannungsprobleme'], ['Motor startet nicht oder läuft im Notlauf', 'Motorkontrollleuchte']);
add('P0602', 'Steuergerät: Programmierfehler', 'Hoch', 'Steuergerät',
  ['Fehlende oder fehlerhafte Programmierung/Codierung', 'Defektes Steuergerät'], ['Motor startet nicht', 'Motorkontrollleuchte']);
add('P0606', 'Steuergerät: Prozessorfehler', 'Hoch', 'Steuergerät',
  ['Defektes Motorsteuergerät', 'Spannungsprobleme', 'Feuchtigkeitsschaden'], ['Notlauf', 'Motor geht aus', 'Motorkontrollleuchte']);
add('P0641', 'Sensorversorgungsspannung A: Stromkreis', 'Mittel', 'Steuergerät',
  ['Kurzschluss in einer Sensorleitung', 'Defekter Sensor mit gemeinsamer Versorgung', 'Defektes Steuergerät'], ['Mehrere Sensorfehler gleichzeitig', 'Notlauf']);
add('P0651', 'Sensorversorgungsspannung B: Stromkreis', 'Mittel', 'Steuergerät',
  ['Kurzschluss in einer Sensorleitung', 'Defekter Sensor mit gemeinsamer Versorgung', 'Defektes Steuergerät'], ['Mehrere Sensorfehler gleichzeitig', 'Notlauf']);
add('P0068', 'Saugrohrdruck/Luftmasse und Drosselklappenstellung unplausibel', 'Mittel', 'Motorsteuerung',
  ['Falschluft', 'Verschmutzte Drosselklappe', 'Defekter Luftmassenmesser oder Saugrohrdrucksensor'], ['Leistungsverlust', 'Unrunder Leerlauf']);
add('P2101', 'Drosselklappensteller: Stromkreis des Motors', 'Hoch', 'Motorsteuerung',
  ['Defekte Drosselklappe', 'Kabel- oder Steckerschaden', 'Defektes Steuergerät'], ['Notlauf', 'Leistungsverlust', 'Unruhiger Leerlauf']);
add('P2106', 'Drosselklappensteller: Leistungsbegrenzung aktiv', 'Hoch', 'Motorsteuerung',
  ['Defekte Drosselklappe', 'Defekter Pedalwertgeber', 'Spannungsprobleme'], ['Notlauf', 'Stark reduzierte Leistung']);
add('P2119', 'Drosselklappe: Bewegungsbereich unplausibel', 'Hoch', 'Motorsteuerung',
  ['Verschmutzte oder verklemmte Drosselklappe', 'Defekter Drosselklappensteller'], ['Notlauf', 'Leistungsverlust']);
add('P2135', 'Drosselklappen-/Pedalsensor A/B: Signale unplausibel', 'Hoch', 'Sensorik',
  ['Defekte Drosselklappe', 'Defekter Pedalwertgeber', 'Kabel- oder Steckerschaden'], ['Notlauf', 'Leistungsverlust']);

// --- Getriebe --------------------------------------------------------------
const TRANS_CAUSES = ['Niedriger oder verschmutzter Getriebeölstand', 'Defektes Magnetventil', 'Kabel- oder Steckerschaden', 'Defektes Getriebesteuergerät'];
const TRANS_SYMPTOMS = ['Schaltprobleme', 'Notlauf des Getriebes', 'Ruckeln beim Schalten'];
add('P0700', 'Getriebesteuerung: Fehler gemeldet', 'Mittel', 'Getriebe', ['Fehler im Getriebesteuergerät – Getriebe separat auslesen'], TRANS_SYMPTOMS);
add('P0715', 'Getriebe-Eingangsdrehzahlsensor: Stromkreis', 'Mittel', 'Getriebe', SENSOR_CAUSES, TRANS_SYMPTOMS);
add('P0720', 'Getriebe-Ausgangsdrehzahlsensor: Stromkreis', 'Mittel', 'Getriebe', SENSOR_CAUSES, ['Falsche Geschwindigkeitsanzeige', ...TRANS_SYMPTOMS]);
add('P0730', 'Getriebe: falsche Übersetzung', 'Hoch', 'Getriebe',
  ['Niedriger Getriebeölstand', 'Verschlissene Kupplungen oder Bänder', 'Defektes Magnetventil', 'Defekter Drehmomentwandler'], ['Schlupf', 'Motor dreht hoch ohne Vortrieb', 'Schaltprobleme']);
add('P0740', 'Wandlerüberbrückungskupplung: Stromkreis', 'Mittel', 'Getriebe', TRANS_CAUSES, ['Ruckeln bei konstanter Fahrt', 'Erhöhter Kraftstoffverbrauch']);
add('P0741', 'Wandlerüberbrückungskupplung: Leistung/Hängt in Aus', 'Mittel', 'Getriebe',
  ['Niedriger Getriebeölstand', 'Verschlissene Wandlerkupplung', 'Defektes Magnetventil'], ['Erhöhter Kraftstoffverbrauch', 'Ruckeln']);
[['P0750', 'A'], ['P0755', 'B'], ['P0760', 'C'], ['P0765', 'D'], ['P0770', 'E']].forEach(([code, letter]) =>
  add(code, `Schaltmagnetventil ${letter}: Stromkreis`, 'Mittel', 'Getriebe', TRANS_CAUSES, TRANS_SYMPTOMS));
add('P0780', 'Getriebe: Schaltfehler', 'Hoch', 'Getriebe',
  ['Niedriger Getriebeölstand', 'Defekte Magnetventile', 'Verschlissene Kupplungen', 'Defektes Getriebesteuergerät'], TRANS_SYMPTOMS);

// --- Netzwerk (U-Codes) ----------------------------------------------------
add('U0001', 'Hochgeschwindigkeits-CAN-Bus: Kommunikationsfehler', 'Hoch', 'Netzwerk', COMM_CAUSES, COMM_SYMPTOMS);
add('U0073', 'Kommunikationsbus: ausgefallen (Bus Off)', 'Hoch', 'Netzwerk', COMM_CAUSES, COMM_SYMPTOMS);
add('U0100', 'Kommunikation mit Motorsteuergerät verloren', 'Hoch', 'Netzwerk',
  ['Defektes Motorsteuergerät oder Stromversorgung', 'Defekte CAN-Verkabelung', 'Niedrige Batteriespannung'], ['Motor startet nicht', 'Mehrere Warnleuchten', 'Notlauf']);
add('U0101', 'Kommunikation mit Getriebesteuergerät verloren', 'Hoch', 'Netzwerk',
  ['Defektes Getriebesteuergerät oder Stromversorgung', 'Defekte CAN-Verkabelung'], ['Getriebe im Notlauf', 'Schaltprobleme', 'Warnleuchten']);
add('U0121', 'Kommunikation mit ABS/ESP-Steuergerät verloren', 'Hoch', 'Netzwerk',
  ['Defektes ABS-Steuergerät oder Stromversorgung', 'Defekte CAN-Verkabelung', 'Sicherung'], ['ABS-/ESP-Warnleuchte', 'ABS/ESP ohne Funktion']);
add('U0140', 'Kommunikation mit Karosseriesteuergerät verloren', 'Mittel', 'Netzwerk',
  ['Defektes Karosseriesteuergerät oder Stromversorgung', 'Defekte CAN-Verkabelung'], ['Ausfall von Licht, Zentralverriegelung oder Fensterhebern']);
add('U0155', 'Kommunikation mit Kombiinstrument verloren', 'Mittel', 'Netzwerk',
  ['Defektes Kombiinstrument', 'Defekte CAN-Verkabelung', 'Stromversorgung'], ['Anzeigen im Kombiinstrument fallen aus']);
add('U0164', 'Kommunikation mit Klimasteuergerät verloren', 'Niedrig', 'Netzwerk',
  ['Defektes Klimasteuergerät', 'Defekte CAN-Verkabelung', 'Sicherung'], ['Klimaanlage ohne Funktion']);

export default DTC_DATABASE;

// Grobe Einordnung unbekannter Codes nach Nummernbereich
export function getSystemHint(rawCode) {
  const code = String(rawCode).toUpperCase();
  const prefix = code[0];
  const group = code[1];
  const sub = code[2];

  if (prefix === 'U') {
    return group === '0' ? 'Kommunikation/Netzwerk (generisch) – Steuergeräte, Bus-Verkabelung und Spannungsversorgung prüfen' : 'Kommunikation/Netzwerk (herstellerspezifisch)';
  }
  if (prefix === 'B') return group === '0' ? 'Karosserie (generisch)' : 'Karosserie (herstellerspezifisch)';
  if (prefix === 'C') return group === '0' ? 'Fahrwerk (generisch)' : 'Fahrwerk (herstellerspezifisch)';
  if (prefix === 'P') {
    if (group === '1' || group === '3') return 'Antriebsstrang – herstellerspezifischer Code, Herstellerdaten erforderlich';
    const systems = {
      '0': 'Kraftstoff-/Luftmessung und Zusatzeinrichtungen',
      '1': 'Kraftstoff-/Luftmessung',
      '2': 'Kraftstoff-/Luftmessung (Einspritzung)',
      '3': 'Zündsystem / Aussetzer',
      '4': 'Abgasnachbehandlung / Zusatzeinrichtungen',
      '5': 'Geschwindigkeit, Leerlauf, Zusatzeingänge',
      '6': 'Steuergerät und Ausgänge',
      '7': 'Getriebe',
      '8': 'Getriebe'
    };
    if (group === '2') return 'Antriebsstrang (generisch, erweitert) – Herstellerdaten empfohlen';
    return `Antriebsstrang (generisch): ${systems[sub] || 'allgemein'}`;
  }
  return 'Unbekanntes Format';
}
