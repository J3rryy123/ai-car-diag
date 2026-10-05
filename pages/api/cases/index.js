import { requireAuth } from '../../../utils/server/auth';
import { db, dbConfigured, sendDbError } from '../../../utils/server/supabase';
import { toRow, fromRow, isScoped, ownOnly, normalizeVin, VIN_PATTERN } from '../../../utils/server/caseMapping';

const LIST_LIMIT = 200;
const VEHICLE_LIMIT = 20;

export default async function handler(req, res) {
  if (!dbConfigured()) {
    return res.status(503).json({ code: 'db_not_configured', message: 'Datenbank ist nicht konfiguriert.' });
  }
  const session = await requireAuth(req, res, { strict: true });
  if (!session) return;

  try {
    if (req.method === 'GET') {
      // Fälle eines Fahrzeugs (Fahrzeughistorie), weiterhin nur im Rahmen der eigenen Sichtbarkeit
      if (req.query?.vin !== undefined) {
        const vin = normalizeVin(String(req.query.vin));
        if (!VIN_PATTERN.test(vin)) return res.status(400).json({ message: 'Ungültige VIN.' });
        const rows = await db(`cases?select=*&vin=eq.${vin}&order=created_at.desc&limit=${VEHICLE_LIMIT}${ownOnly(session)}`);
        return res.status(200).json({ cases: rows.map(fromRow), scope: isScoped(session) ? 'own' : 'all' });
      }
      const rows = await db(`cases?select=*&order=created_at.desc&limit=${LIST_LIMIT}${ownOnly(session)}`);
      return res.status(200).json({ cases: rows.map(fromRow), scope: isScoped(session) ? 'own' : 'all' });
    }

    if (req.method === 'POST') {
      const input = Array.isArray(req.body?.cases) ? req.body.cases.slice(0, LIST_LIMIT) : [req.body];
      const author = session.user ? session.user.display_name || session.user.username : '';
      const rows = input.map(toRow).filter(Boolean).map((row) => (author ? { ...row, created_by: author, created_by_id: session.user.id } : row));
      if (!rows.length) return res.status(400).json({ message: 'Ungültiger Fall.' });
      const saved = await db('cases', { method: 'POST', body: rows, prefer: 'return=representation' });
      return res.status(201).json({ cases: saved.map(fromRow) });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    return sendDbError(res, error);
  }
}
