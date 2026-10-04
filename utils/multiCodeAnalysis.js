import OBD2_DECODER from './obdDecoder';

// Auswertung mehrerer Fehlercodes: Priorisierung und Zusammenhänge.
// Die Regeln sind allgemeine Erfahrungswerte, keine herstellerspezifischen Aussagen.

const CODE_PATTERN = /^[PBCU][0-9A-F]{4}$/;

export function parseCodes(text) {
  const tokens = text.toUpperCase().split(/[\s,;]+/).filter(Boolean);
  const valid = [];
  const invalid = [];
  for (const token of tokens) {
    if (CODE_PATTERN.test(token)) {
      if (!valid.includes(token)) valid.push(token);
    } else if (!invalid.includes(token)) {
      invalid.push(token);
    }
  }
  return { valid, invalid };
}

const SEVERITY_LEVELS = {
  niedrig: 1, low: 1,
  mittel: 2, medium: 2,
  hoch: 3, high: 3,
  kritisch: 4, critical: 4
};

export const SEVERITY_LABELS = { 0: 'Unbekannt', 1: 'Niedrig', 2: 'Mittel', 3: 'Hoch', 4: 'Kritisch' };

const has = (codes, test) => codes.filter((c) => test(c));
const inRange = (code, from, to) => code.startsWith('P') && code >= from && code <= to;
const isMisfire = (c) => /^P03(0[0-9]|1[0-2])$/.test(c);
const isLeanCode = (c) => c === 'P0171' || c === 'P0174';
const isRichCode = (c) => c === 'P0172' || c === 'P0175';
const isCatCode = (c) => c === 'P0420' || c === 'P0430';
const isLambdaCode = (c) => inRange(c, 'P0130', 'P0167');
const isEvapCode = (c) => /^P04(4[0-9]|5[0-9])$/.test(c);
const isCoolantSensor = (c) => inRange(c, 'P0115', 'P0119');
const isBoostCode = (c) => ['P0234', 'P0235', 'P0236', 'P0238', 'P0243', 'P0245', 'P0246', 'P0299'].includes(c);

const RULES = [
  {
    id: 'misfire-multi',
    match: (codes) => has(codes, (c) => isMisfire(c) && c !== 'P0300').length >= 2 || (has(codes, isMisfire).length >= 2 && codes.includes('P0300')),
    title: 'Aussetzer an mehreren Zylindern',
    text: 'Mehrere Zylinder betroffen: Eine gemeinsame Ursache ist wahrscheinlicher als mehrere defekte Einzelteile. Kraftstoffdruck/-qualität, Falschluft, Zündversorgung (Spannung, Masse) und Motorsteuerung zuerst prüfen, bevor Kerzen und Spulen einzeln getauscht werden.',
    priority: 3
  },
  {
    id: 'lean-both',
    match: (codes) => codes.includes('P0171') && codes.includes('P0174'),
    title: 'Gemisch auf beiden Bänken zu mager',
    text: 'Beide Bänke betroffen: Die Ursache liegt vermutlich vor der Aufteilung der Bänke – Luftmassenmesser, Falschluft im Ansaugtrakt, Kraftstoffdruck oder Kurbelgehäuseentlüftung. Eine einzelne Lambdasonde ist unwahrscheinlich.',
    priority: 3
  },
  {
    id: 'rich-both',
    match: (codes) => codes.includes('P0172') && codes.includes('P0175'),
    title: 'Gemisch auf beiden Bänken zu fett',
    text: 'Beide Bänke betroffen: Luftmassenmesser, Kraftstoffdruck/Druckregler, verstopfter Luftfilter oder Tankentlüftungsventil prüfen.',
    priority: 2
  },
  {
    id: 'lean-misfire',
    match: (codes) => has(codes, isLeanCode).length > 0 && has(codes, isMisfire).length > 0,
    title: 'Magergemisch zusammen mit Aussetzern',
    text: 'Zu mageres Gemisch kann Aussetzer verursachen. Zuerst Falschluft und Kraftstoffversorgung klären, dann erst Zündteile bewerten.',
    priority: 3
  },
  {
    id: 'cat-follow-up',
    match: (codes) =>
      has(codes, isCatCode).length > 0 &&
      (has(codes, isMisfire).length > 0 || has(codes, isLeanCode).length > 0 || has(codes, isRichCode).length > 0 || has(codes, isLambdaCode).length > 0),
    title: 'Katalysatorcode mit weiteren Gemisch-/Zündfehlern',
    text: 'Der Katalysatorcode ist hier vermutlich ein Folgefehler. Zuerst Aussetzer, Gemischfehler und Lambdasonden beheben, Fehlerspeicher löschen und beobachten, bevor ein Katalysator getauscht wird. Aussetzer können den Katalysator zusätzlich schädigen.',
    priority: 3
  },
  {
    id: 'lambda-and-mixture',
    match: (codes) => has(codes, isLambdaCode).length > 0 && (has(codes, isLeanCode).length > 0 || has(codes, isRichCode).length > 0),
    title: 'Lambdasonden- und Gemischfehler gleichzeitig',
    text: 'Gemischabweichungen können Sondenfehler auslösen und umgekehrt. Sondenverkabelung und Heizung prüfen, aber auch Falschluft und Kraftstoffdruck ausschließen, bevor die Sonde getauscht wird.',
    priority: 2
  },
  {
    id: 'evap',
    match: (codes) => has(codes, isEvapCode).length >= 2,
    title: 'Mehrere Fehler im Tankentlüftungssystem',
    text: 'Tankdeckel (Dichtung, Verschluss) und Tankentlüftungsventil zuerst prüfen. Danach Leitungen per Rauchtest auf Undichtigkeit untersuchen.',
    priority: 1
  },
  {
    id: 'coolant',
    match: (codes) => codes.includes('P0128') && has(codes, isCoolantSensor).length > 0,
    title: 'Kühlmitteltemperatur: Thermostat und Sensor',
    text: 'Messwert der Kühlmitteltemperatur mit einem Referenzthermometer vergleichen, um Sensorfehler von einem klemmenden Thermostat zu unterscheiden.',
    priority: 2
  },
  {
    id: 'idle-and-lean',
    match: (codes) => (codes.includes('P0507') || codes.includes('P0506')) && has(codes, isLeanCode).length > 0,
    title: 'Leerlaufabweichung und Magergemisch',
    text: 'Beides spricht für Falschluft im Ansaugsystem. Rauchtest durchführen, bevor Leerlaufsteller oder Drosselklappe getauscht werden.',
    priority: 2
  },
  {
    id: 'boost',
    match: (codes) => has(codes, isBoostCode).length > 0 && has(codes, isMisfire).length === 0,
    title: 'Ladedruckfehler',
    text: 'Ladeluftstrecke abdrücken, Ladedrucksteller und Unterdruckversorgung prüfen (siehe Geführte Fehlersuche: Ladedruck zu niedrig).',
    priority: 2
  },
  {
    id: 'network',
    match: (codes) => has(codes, (c) => c.startsWith('U')).length >= 2,
    title: 'Mehrere Kommunikationsfehler (U-Codes)',
    text: 'Zuerst Batteriespannung, Masseanschlüsse und Stromversorgung der Steuergeräte prüfen, danach CAN-Bus-Verkabelung und Abschlusswiderstände. Der Ausfall eines Steuergeräts kann viele Folgefehler in anderen Steuergeräten auslösen.',
    priority: 3
  },
  {
    id: 'many-unrelated',
    match: (codes) => codes.length >= 6 && new Set(codes.map((c) => c.slice(0, 3))).size >= 5,
    title: 'Viele unterschiedliche Fehler gleichzeitig',
    text: 'Viele unzusammenhängende Codes deuten oft auf Spannungsprobleme (Batterie, Generator, Masse) hin. Spannungsversorgung messen, Fehlerspeicher löschen und prüfen, welche Codes zurückkehren.',
    priority: 2
  }
];

export function analyzeCodes(codes) {
  const entries = codes.map((code) => {
    const info = OBD2_DECODER.decodeCode(code);
    const known = info.description !== 'Unbekannter Fehlercode';
    const level = SEVERITY_LEVELS[String(info.severity).toLowerCase()] || 0;
    return { code, info, known, level };
  });

  // Dringlichste Fehler zuerst, bei gleicher Stufe nach Code sortieren
  entries.sort((a, b) => b.level - a.level || a.code.localeCompare(b.code));

  const groups = {};
  for (const entry of entries) {
    const category = entry.known ? entry.info.category : 'Nicht in der Datenbank';
    (groups[category] = groups[category] || []).push(entry);
  }

  const matched = RULES.filter((rule) => rule.match(codes));
  // "Viele unterschiedliche Fehler" nur als Auffangregel, wenn sich die Codes sonst nicht erklären lassen
  const correlations = matched
    .filter((rule) => rule.id !== 'many-unrelated' || matched.length === 1)
    .sort((a, b) => b.priority - a.priority)
    .map(({ id, title, text }) => ({ id, title, text }));

  const unknownCount = entries.filter((e) => !e.known).length;
  const maxLevel = entries.reduce((max, e) => Math.max(max, e.level), 0);

  return { entries, groups, correlations, unknownCount, maxLevel };
}
