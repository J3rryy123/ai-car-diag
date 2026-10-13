import { requireAuth } from '../../../utils/server/auth';
import { db, dbConfigured, sendDbError } from '../../../utils/server/supabase';
import { isScoped, ownOnly, normalizeVin, VIN_PATTERN } from '../../../utils/server/caseMapping';
import { toRow, fromRow } from '../../../utils/server/vehicleMapping';

const LIST_LIMIT = 500;

export default async function handler(req, res) {
  if (!dbConfigured()) {
    return res.status(503).json({ code: 'db_not_configured', message: 'Datenbank ist nicht konfiguriert.' });
  }
  const session = await requireAuth(req, res, { strict: true });
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const scope = isScoped(session) ? 'own' : 'all';
      // Gespeicherte Fahrzeuge zu einer VIN (im Rahmen der eigenen Sichtbarkeit)
      if (req.query?.vin !== undefined) {
        const vin = normalizeVin(String(req.query.vin));
        if (!VIN_PATTERN.test(vin)) return res.status(400).json({ message: 'Ungültige VIN.' });
        const rows = await db(`vehicles?select=*&vin=eq.${vin}&order=updated_at.desc${ownOnly(session)}`);
        return res.status(200).json({ vehicles: rows.map(fromRow), scope });
      }
      const rows = await db(`vehicles?select=*&order=updated_at.desc&limit=${LIST_LIMIT}${ownOnly(session)}`);
      return res.status(200).json({ vehicles: rows.map(fromRow), scope });
    }

    // Speichern: legt das Fahrzeug an oder aktualisiert den eigenen Eintrag zur selben VIN
    if (req.method === 'POST') {
      const row = toRow(req.body);
      if (!row) return res.status(400).json({ message: 'Ungültige VIN oder Fahrzeugdaten.' });
      const now = new Date().toISOString();
      const owner = session.user ? `created_by_id=eq.${session.user.id}` : 'created_by_id=is.null';
      const [existing] = await db(`vehicles?select=id&vin=eq.${row.vin}&${owner}&limit=1`);
      if (existing) {
        const [updated] = await db(`vehicles?id=eq.${existing.id}&${owner}`, {
          method: 'PATCH',
          body: { ...row, updated_at: now },
          prefer: 'return=representation'
        });
        return res.status(200).json({ vehicle: fromRow(updated), created: false });
      }
      const author = session.user ? session.user.display_name || session.user.username : '';
      const [created] = await db('vehicles', {
        method: 'POST',
        body: [{ ...row, updated_at: now, ...(author ? { created_by: author, created_by_id: session.user.id } : {}) }],
        prefer: 'return=representation'
      });
      return res.status(201).json({ vehicle: fromRow(created), created: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    return sendDbError(res, error);
  }
}
