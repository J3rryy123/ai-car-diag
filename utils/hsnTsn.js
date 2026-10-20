// Herstellerschlüsselnummer (HSN, Fahrzeugschein Feld 2.1, 4 Zeichen) und Typschlüsselnummer (TSN, Feld 2.2, 3 Zeichen)
export const HSN_PATTERN = /^[0-9A-Z]{4}$/;
export const TSN_PATTERN = /^[0-9A-Z]{3}$/;

// Eingabe bereinigen: Großbuchstaben, nur Buchstaben/Ziffern, auf die Länge gekürzt
export const cleanHsn = (value) => String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 4);
export const cleanTsn = (value) => String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 3);

/** Setzt HSN/TSN in den Fahrzeugschein-Daten (auch ohne Scan); leere Daten ergeben null. */
export function withHsnTsn(registration, hsn, tsn) {
  const { hsn: _hsn, tsn: _tsn, ...rest } = registration || {};
  const next = { ...rest, ...(hsn && { hsn }), ...(tsn && { tsn }) };
  return Object.keys(next).length ? next : null;
}
