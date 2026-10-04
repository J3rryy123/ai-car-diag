// Geführte Fehlersuche: Prüfabläufe für häufige Fehlerbilder.
// Richtwerte sind allgemeine Erfahrungswerte – Herstellerangaben haben immer Vorrang.

const GUIDED_PROCEDURES = [
  {
    id: 'misfire',
    title: 'Motor ruckelt / Zündaussetzer',
    icon: '💥',
    description: 'Fehlzündungen, unrunder Lauf, Codes P0300–P0312',
    steps: [
      {
        id: 'dtc',
        title: 'Fehlerspeicher und Freeze Frame auslesen',
        how: 'Alle Steuergeräte auslesen. Betroffenen Zylinder, Last, Drehzahl und Motortemperatur zum Fehlerzeitpunkt notieren.',
        expected: 'Fehlzündung einem Zylinder zugeordnet (P0301–P0312) oder zufällig (P0300)',
        failHint: 'Zufällige Aussetzer deuten eher auf Kraftstoffversorgung, Falschluft oder Zündversorgung aller Zylinder.'
      },
      {
        id: 'plugs',
        title: 'Zündkerzen prüfen',
        how: 'Kerze des betroffenen Zylinders ausbauen. Kerzenbild, Elektrodenverschleiß, Risse im Isolator und Elektrodenabstand prüfen.',
        expected: 'Gleichmäßiges Kerzenbild, Elektrodenabstand nach Herstellerangabe',
        measure: { label: 'Elektrodenabstand', unit: 'mm' },
        failHint: 'Verschlissene oder verrußte Kerzen ersetzen. Ölige oder nasse Kerzen: Ventilschaftdichtungen, Kolbenringe oder Einspritzventil prüfen.'
      },
      {
        id: 'coil',
        title: 'Zündspule mit Nachbarzylinder tauschen',
        how: 'Zündspule des betroffenen Zylinders mit der eines funktionierenden Zylinders tauschen, Fehlerspeicher löschen, Probefahrt, erneut auslesen.',
        expected: 'Fehler bleibt am ursprünglichen Zylinder',
        failHint: 'Wandert der Fehler mit der Spule, ist die Zündspule defekt (bzw. deren Stecker/Ansteuerung prüfen).'
      },
      {
        id: 'injector',
        title: 'Einspritzventil prüfen',
        how: 'Mit Stethoskop auf Klickgeräusch hören, Stecker und Ansteuersignal prüfen, Spulenwiderstand messen (Herstellerangabe, oft ca. 10–16 Ω bei Hochohm-Ventilen).',
        expected: 'Hörbares Klicken, Widerstand im Sollbereich',
        measure: { label: 'Widerstand', unit: 'Ω' },
        failHint: 'Kein Klicken oder abweichender Widerstand: Ventil oder Verkabelung/Ansteuerung defekt.'
      },
      {
        id: 'compression',
        title: 'Kompression messen',
        how: 'Motor warm, alle Kerzen raus, Drosselklappe offen, Anlasser ca. 5 Umdrehungen. Alle Zylinder messen und vergleichen.',
        expected: 'Werte nach Herstellerangabe, Abweichung zwischen den Zylindern gering (Richtwert max. ca. 10–15 %)',
        measure: { label: 'Kompression (betroffener Zylinder)', unit: 'bar' },
        failHint: 'Zu niedrige Kompression: Ventile, Zylinderkopfdichtung oder Kolbenringe. Mit Öl-Nasstest eingrenzen (steigt der Wert → Kolbenringe/Zylinder).'
      },
      {
        id: 'vacuum',
        title: 'Falschluft prüfen',
        how: 'Ansaugtrakt, Unterdruckschläuche und Dichtungen per Rauchtest oder Bremsenreiniger-Test prüfen.',
        expected: 'Keine Undichtigkeit, Leerlauf unverändert',
        failHint: 'Undichtigkeit beseitigen – Falschluft verursacht magere Gemischbildung und Aussetzer, besonders im Leerlauf.'
      }
    ]
  },
  {
    id: 'nostart',
    title: 'Motor startet nicht',
    icon: '🔑',
    description: 'Anlasser dreht nicht oder Motor dreht, springt aber nicht an',
    steps: [
      {
        id: 'battery',
        title: 'Batteriespannung messen',
        how: 'Ruhespannung an den Polen messen. Danach beim Startversuch die Spannung beobachten.',
        expected: 'Ruhespannung ca. 12,4–12,8 V, beim Starten nicht unter ca. 9,6 V',
        measure: { label: 'Ruhespannung', unit: 'V' },
        failHint: 'Batterie laden und Last-/Kapazitätstest durchführen. Danach Ladesystem prüfen.'
      },
      {
        id: 'terminals',
        title: 'Polklemmen und Masseverbindungen prüfen',
        how: 'Pole, Batteriekabel, Masseband Motor/Karosserie auf Korrosion und festen Sitz prüfen. Spannungsabfall unter Last messen.',
        expected: 'Spannungsabfall pro Leitung unter Last gering (Richtwert unter ca. 0,5 V)',
        measure: { label: 'Spannungsabfall', unit: 'V' },
        failHint: 'Kontaktstellen reinigen/erneuern, defekte Massebänder ersetzen.'
      },
      {
        id: 'starter',
        title: 'Anlasser prüfen',
        how: 'Dreht der Anlasser nicht: Spannung an Klemme 50 beim Startversuch und am Magnetschalter prüfen. Klickt nur der Magnetschalter, Anlasser-Stromaufnahme prüfen.',
        expected: 'Anlasser dreht den Motor zügig durch',
        failHint: 'Spannung vorhanden, aber keine Funktion: Anlasser defekt. Keine Spannung an Klemme 50: Zündschloss, Relais, Wegfahrsperre, Getriebe-/Kupplungsschalter prüfen.'
      },
      {
        id: 'immobilizer',
        title: 'Wegfahrsperre / Steuergeräte prüfen',
        how: 'Kontrollleuchte der Wegfahrsperre beobachten, Fehlerspeicher (Motor, Immobilizer) auslesen.',
        expected: 'Keine Immobilizer-Sperre, Steuergerät kommuniziert',
        failHint: 'Schlüssel anlernen/prüfen bzw. Antenne und Steuergerät diagnostizieren.'
      },
      {
        id: 'fuel',
        title: 'Kraftstoffversorgung prüfen',
        how: 'Beim Einschalten der Zündung Förderpumpe hören. Kraftstoffdruck an der Rail messen (Herstellerangabe).',
        expected: 'Pumpe läuft an, Druck im Sollbereich',
        measure: { label: 'Kraftstoffdruck', unit: 'bar' },
        failHint: 'Pumpe, Pumpenrelais, Sicherung, Kraftstofffilter oder Druckregler prüfen.'
      },
      {
        id: 'crank',
        title: 'Kurbelwellen-/Nockenwellensignal prüfen',
        how: 'Drehzahl im Messwerteblock beim Startversuch kontrollieren, Signal ggf. mit Oszilloskop messen.',
        expected: 'Drehzahlsignal beim Starten vorhanden',
        failHint: 'Kein Signal: Geber, Verkabelung oder Zahnscheibe prüfen. Ohne Signal gibt es weder Zündung noch Einspritzung.'
      },
      {
        id: 'ignition',
        title: 'Zündung bzw. Vorglühen prüfen',
        how: 'Benziner: Zündfunke prüfen. Diesel: Glühkerzen und Vorglühanlage prüfen (Stromaufnahme, Widerstand).',
        expected: 'Kräftiger Zündfunke bzw. funktionierende Glühkerzen',
        failHint: 'Zündspulen, Zündmodul oder Glühkerzen/Glühsteuergerät ersetzen bzw. weiter eingrenzen.'
      }
    ]
  },
  {
    id: 'charging',
    title: 'Batterie entlädt sich / Ladesystem',
    icon: '🔋',
    description: 'Batterie leer, Ladekontrollleuchte, hoher Ruhestrom',
    steps: [
      {
        id: 'rest',
        title: 'Ruhespannung der Batterie messen',
        how: 'Fahrzeug mindestens eine Stunde ruhen lassen, dann Spannung an den Polen messen.',
        expected: 'Ca. 12,4–12,8 V',
        measure: { label: 'Ruhespannung', unit: 'V' },
        failHint: 'Unter ca. 12,4 V: Batterie nachladen und mit Batterietester prüfen.'
      },
      {
        id: 'charge',
        title: 'Ladespannung messen',
        how: 'Motor bei ca. 2000 1/min, Verbraucher an. Spannung an der Batterie messen.',
        expected: 'Ca. 13,8–14,7 V',
        measure: { label: 'Ladespannung', unit: 'V' },
        failHint: 'Zu niedrig oder zu hoch: Generator/Regler prüfen. Bei intelligenten Ladesystemen Messwerte per Diagnosegerät vergleichen.'
      },
      {
        id: 'belt',
        title: 'Antriebsriemen und Spanner prüfen',
        how: 'Riemen auf Verschleiß, Risse und Spannung prüfen, Freilauf-Riemenscheibe des Generators kontrollieren.',
        expected: 'Riemen intakt und ausreichend gespannt',
        failHint: 'Riemen, Spanner oder Generator-Freilauf erneuern.'
      },
      {
        id: 'ripple',
        title: 'Welligkeit der Ladespannung prüfen',
        how: 'Multimeter auf Wechselspannung (AC) stellen und an der Batterie bei laufendem Motor messen.',
        expected: 'Gering, Richtwert unter ca. 0,5 V AC',
        measure: { label: 'AC-Anteil', unit: 'V' },
        failHint: 'Hoher AC-Anteil deutet auf defekte Generatordioden hin.'
      },
      {
        id: 'drain',
        title: 'Ruhestrom messen',
        how: 'Fahrzeug abschließen, alle Steuergeräte einschlafen lassen (je nach Fahrzeug 20–60 Minuten), Strom mit Zangenmessgerät oder in Reihe messen.',
        expected: 'Richtwert ca. 20–50 mA',
        measure: { label: 'Ruhestrom', unit: 'mA' },
        failHint: 'Zu hoch: Sicherungen einzeln ziehen und Stromanstieg beobachten, um den Verbraucher zu finden.'
      }
    ]
  },
  {
    id: 'overheat',
    title: 'Motor überhitzt / Kühlsystem',
    icon: '🌡️',
    description: 'Temperaturanzeige steigt, Kühlmittelverlust',
    steps: [
      {
        id: 'level',
        title: 'Kühlmittelstand und Zustand prüfen',
        how: 'Nur bei kaltem Motor öffnen. Stand, Farbe, Öl- oder Schlammreste im Ausgleichsbehälter prüfen.',
        expected: 'Stand zwischen MIN und MAX, sauberes Kühlmittel',
        failHint: 'Ölspuren oder Schlamm: Zylinderkopfdichtung bzw. Ölkühler prüfen. Zu wenig Kühlmittel: Leck suchen.'
      },
      {
        id: 'leak',
        title: 'Systemdruck prüfen',
        how: 'Mit Kühlsystem-Druckprüfer abdrücken (Wert nach Deckelaufdruck, typisch ca. 1,0–1,6 bar). Schläuche, Kühler, Wasserpumpe auf Leckage prüfen.',
        expected: 'Druck bleibt konstant',
        measure: { label: 'Prüfdruck', unit: 'bar' },
        failHint: 'Druckverlust: undichte Stelle suchen. Kein sichtbares Leck: Zylinderkopfdichtung oder Heizungswärmetauscher prüfen.'
      },
      {
        id: 'cap',
        title: 'Verschlussdeckel prüfen',
        how: 'Öffnungsdruck des Deckels mit dem Druckprüfer testen.',
        expected: 'Öffnungsdruck nach Aufdruck',
        failHint: 'Defekter Deckel: ersetzen.'
      },
      {
        id: 'thermostat',
        title: 'Thermostat prüfen',
        how: 'Beim Warmlaufen oberen und unteren Kühlerschlauch fühlen. Öffnungstemperatur nach Herstellerangabe (meist ca. 80–95 °C).',
        expected: 'Großer Kühlkreislauf öffnet bei Sollwert',
        measure: { label: 'Öffnungstemperatur', unit: '°C' },
        failHint: 'Thermostat öffnet nicht (oberer Schlauch heiß, unterer kalt): ersetzen.'
      },
      {
        id: 'fan',
        title: 'Lüfter prüfen',
        how: 'Lüfter per Diagnosegerät ansteuern oder Klimaanlage einschalten. Relais, Sicherung und Temperaturgeber prüfen.',
        expected: 'Lüfter läuft in den vorgesehenen Stufen an',
        failHint: 'Lüftermotor, Relais, Steuergerät oder Temperaturgeber prüfen.'
      },
      {
        id: 'co',
        title: 'Abgase im Kühlsystem nachweisen',
        how: 'Blasentest oder CO2-Test im Ausgleichsbehälter bei laufendem Motor durchführen.',
        expected: 'Keine Verfärbung / keine Gasbläschen',
        failHint: 'Positiv: Zylinderkopfdichtung oder Zylinderkopf defekt.'
      }
    ]
  },
  {
    id: 'lean',
    title: 'Gemisch zu mager (P0171 / P0174)',
    icon: '💨',
    description: 'Magerlauf, hohe Gemischkorrektur, unrunder Leerlauf',
    steps: [
      {
        id: 'trims',
        title: 'Gemischkorrektur (Fuel Trims) auslesen',
        how: 'Kurz- und Langzeitkorrektur im Leerlauf und bei ca. 2500 1/min im Messwerteblock vergleichen.',
        expected: 'Korrektur nahe 0 %, Richtwert innerhalb von etwa ±10 %',
        measure: { label: 'Langzeitkorrektur Leerlauf', unit: '%' },
        failHint: 'Hoher Wert im Leerlauf, der bei höherer Drehzahl sinkt, deutet auf Falschluft. Hoher Wert bei Last eher auf Kraftstoffmangel oder Luftmassenmesser.'
      },
      {
        id: 'leaks',
        title: 'Falschluft suchen',
        how: 'Ansaugtrakt, Unterdruckschläuche, Kurbelgehäuseentlüftung, Bremskraftverstärker-Schlauch per Rauchtest prüfen.',
        expected: 'Keine Undichtigkeit',
        failHint: 'Undichte Stelle abdichten bzw. defekte Teile ersetzen.'
      },
      {
        id: 'maf',
        title: 'Luftmassenmesser prüfen',
        how: 'Messwert im Leerlauf mit Sollwert vergleichen, Sensor vorsichtig mit speziellem Reiniger säubern, Wert erneut prüfen.',
        expected: 'Luftmasse plausibel zur Motorgröße und Drehzahl',
        measure: { label: 'Luftmasse Leerlauf', unit: 'g/s' },
        failHint: 'Unplausible Werte: Luftmassenmesser ersetzen, Verkabelung prüfen.'
      },
      {
        id: 'fuelpress',
        title: 'Kraftstoffdruck prüfen',
        how: 'Druck an der Rail im Leerlauf und unter Last messen, Haltedruck nach Abstellen prüfen.',
        expected: 'Druck nach Herstellerangabe, Haltedruck stabil',
        measure: { label: 'Kraftstoffdruck', unit: 'bar' },
        failHint: 'Pumpe, Filter, Druckregler oder Leitungen prüfen.'
      },
      {
        id: 'exhaust',
        title: 'Abgasanlage auf Undichtigkeit prüfen',
        how: 'Krümmer, Flansche und Bereich vor der Lambdasonde auf Lecks untersuchen.',
        expected: 'Abgasanlage dicht',
        failHint: 'Leck vor der Sonde lässt Fremdluft ein – Abdichten bzw. ersetzen, danach Sonde neu bewerten.'
      }
    ]
  },
  {
    id: 'boost',
    title: 'Ladedruck zu niedrig / Leistungsverlust',
    icon: '🌀',
    description: 'Turbomotor ohne Leistung, Notlauf, Ladedruckfehler (z. B. P0299)',
    steps: [
      {
        id: 'values',
        title: 'Soll- und Ist-Ladedruck vergleichen',
        how: 'Im Messwerteblock bei Volllast (Probefahrt oder Prüfstand) Soll- und Ist-Ladedruck aufzeichnen.',
        expected: 'Ist-Wert folgt dem Soll-Wert',
        measure: { label: 'Ist-Ladedruck', unit: 'bar' },
        failHint: 'Ist deutlich unter Soll: Leckage, Ladedrucksteller oder Turbolader prüfen.'
      },
      {
        id: 'hoses',
        title: 'Ladeluftstrecke abdrücken',
        how: 'Ladeluftschläuche, Schellen und Ladeluftkühler mit Druckprüfgerät abdrücken (niedriger Druck, nicht über Herstellerangabe), Ölspuren und Risse suchen.',
        expected: 'Druck bleibt stabil',
        failHint: 'Undichte Schläuche, Schellen oder Ladeluftkühler ersetzen.'
      },
      {
        id: 'actuator',
        title: 'Ladedrucksteller / Unterdruckversorgung prüfen',
        how: 'Unterdruckschläuche und Magnetventil prüfen, Stellglied (Wastegate / VTG) mechanisch auf Leichtgängigkeit und über Diagnosegerät auf Ansteuerung testen.',
        expected: 'Stellglied bewegt sich leichtgängig und folgt der Ansteuerung',
        failHint: 'Festsitzende oder defekte Steller instandsetzen bzw. ersetzen.'
      },
      {
        id: 'backpressure',
        title: 'Abgasgegendruck prüfen',
        how: 'Partikelfilter-Beladung, Katalysator und Abgasanlage auf Verstopfung prüfen (Differenzdruck/Messwerte).',
        expected: 'Kein erhöhter Abgasgegendruck',
        failHint: 'Verstopfter Filter oder Katalysator: regenerieren bzw. ersetzen.'
      },
      {
        id: 'turbo',
        title: 'Turbolader prüfen',
        how: 'Auf Wellenspiel, Ölleckage und pfeifende Geräusche prüfen.',
        expected: 'Kein merkliches Wellenspiel, keine Leckage',
        failHint: 'Defekter Lader: erst Ursache (Ölversorgung, Fremdkörper) beseitigen, dann Lader ersetzen.'
      }
    ]
  }
];

export default GUIDED_PROCEDURES;
