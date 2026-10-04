import VIN_DECODER from '../vinDecoder';

const KW_TO_PS = 1.35962;

// Schema für die Auswertung der Zulassungsbescheinigung Teil I (Fahrzeugschein)
export const REGISTRATION_TOOL = {
  name: 'report_registration',
  description: 'Gibt die technischen Fahrzeugdaten aus einem Foto der Zulassungsbescheinigung Teil I zurück.',
  input_schema: {
    type: 'object',
    properties: {
      isRegistrationDocument: {
        type: 'boolean',
        description: 'true, wenn das Bild eine Zulassungsbescheinigung Teil I (Fahrzeugschein) zeigt',
      },
      vin: { type: 'string', description: 'Feld E: Fahrzeug-Identifizierungsnummer (17 Zeichen)' },
      hsn: { type: 'string', description: 'Feld 2.1: Herstellerschlüsselnummer (4 Zeichen)' },
      tsn: { type: 'string', description: 'Feld 2.2: Typschlüsselnummer (3 Zeichen)' },
      make: { type: 'string', description: 'Feld D.1: Marke' },
      type: { type: 'string', description: 'Feld D.2: Typ/Variante/Version' },
      model: { type: 'string', description: 'Feld D.3: Handelsbezeichnung' },
      firstRegistration: { type: 'string', description: 'Feld B: Tag der Erstzulassung, Format TT.MM.JJJJ' },
      fuel: { type: 'string', description: 'Feld P.3: Kraftstoff bzw. Energiequelle, wie gedruckt' },
      displacementCcm: { type: 'number', description: 'Feld P.1: Hubraum in cm³' },
      powerKw: { type: 'number', description: 'Feld P.2: Nennleistung in kW' },
      plate: { type: 'string', description: 'Feld A: amtliches Kennzeichen' },
      color: { type: 'string', description: 'Feld R: Farbe des Fahrzeugs' },
    },
    required: ['isRegistrationDocument'],
  },
};

export const REGISTRATION_PROMPT = `Lies die Fahrzeugdaten aus diesem Foto einer deutschen Zulassungsbescheinigung Teil I (Fahrzeugschein) und übergib sie über das Tool.
Regeln:
- Übernimm nur, was du eindeutig lesen kannst. Lass unleserliche oder fehlende Felder weg – niemals raten oder ergänzen.
- Die FIN (Feld E) hat genau 17 Zeichen und enthält nie die Buchstaben I, O oder Q. Prüfe Verwechslungen (0/O, 1/I, 5/S, 8/B) sorgfältig.
- Gib keine personenbezogenen Daten zurück (Name, Anschrift, Geburtsdatum des Halters).
- Zeigt das Bild keinen Fahrzeugschein, setze isRegistrationDocument auf false und lass alles andere weg.`;

const text = (value, max = 60) => {
  if (typeof value !== 'string') return null;
  const v = value.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max);
  return v || null;
};

const FUELS = [
  [/elektro.*(benzin|diesel)|(benzin|diesel).*elektro|hybrid/i, 'Hybrid'],
  [/elektro|strom/i, 'Elektro'],
  [/diesel/i, 'Diesel'],
  [/benzin|otto|super/i, 'Benzin'],
  [/erdgas|cng/i, 'Erdgas'],
  [/flüssiggas|fluessiggas|lpg|autogas/i, 'Autogas'],
  [/wasserstoff/i, 'Wasserstoff'],
];

function parseDate(value) {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec((value || '').trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1950 || year > new Date().getFullYear() + 1) return null;
  return { iso: `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, year };
}

// Bereinigt die Modellantwort und prüft sie gegen bekannte Formate. Liefert { fields, warnings }.
export function normalizeRegistration(raw) {
  const warnings = [];
  const input = raw && typeof raw === 'object' ? raw : {};
  const fields = {};

  const vin = VIN_DECODER.cleanVIN(input.vin);
  if (vin) {
    if (!VIN_DECODER.isVinFormat(vin)) {
      warnings.push('Die gelesene FIN ist ungültig (nicht 17 Zeichen oder verbotene Zeichen) und wurde nicht übernommen.');
    } else {
      const decoded = VIN_DECODER.decodeVIN(vin);
      if (decoded && !decoded.isValid && /Prüfziffer/.test(decoded.error || '')) {
        warnings.push('Die Prüfziffer der gelesenen FIN stimmt nicht – bitte die FIN genau kontrollieren.');
      }
      fields.vin = vin;
    }
  }

  const hsn = text(input.hsn, 20)?.toUpperCase();
  if (hsn && /^[0-9A-Z]{4}$/.test(hsn)) fields.hsn = hsn;
  const tsn = text(input.tsn, 20)?.toUpperCase();
  if (tsn && /^[0-9A-Z]{3}$/.test(tsn)) fields.tsn = tsn;

  const make = text(input.make);
  if (make) fields.make = make;
  const type = text(input.type);
  if (type) fields.type = type;
  const model = text(input.model);
  if (model) fields.model = model;

  const date = parseDate(text(input.firstRegistration, 12));
  if (date) {
    fields.firstRegistration = date.iso;
    fields.firstRegistrationYear = date.year;
  } else if (input.firstRegistration) {
    warnings.push('Das Datum der Erstzulassung konnte nicht eindeutig gelesen werden.');
  }

  const fuelRaw = text(input.fuel);
  if (fuelRaw) {
    fields.fuelRaw = fuelRaw;
    const hit = FUELS.find(([re]) => re.test(fuelRaw));
    if (hit) fields.fuel = hit[1];
  }

  const ccm = Number(input.displacementCcm);
  if (Number.isFinite(ccm) && ccm >= 50 && ccm <= 12000) fields.displacementCcm = Math.round(ccm);
  const kw = Number(input.powerKw);
  if (Number.isFinite(kw) && kw > 0 && kw <= 1500) {
    fields.powerKw = Math.round(kw);
    fields.powerPs = Math.round(kw * KW_TO_PS);
  }

  const plate = text(input.plate, 15);
  if (plate) fields.plate = plate.toUpperCase();
  const color = text(input.color, 30);
  if (color) fields.color = color;

  return { fields, warnings };
}
