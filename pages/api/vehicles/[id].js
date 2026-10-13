import { requireAuth } from '../../../utils/server/auth';
import { db, dbConfigured, sendDbError } from '../../../utils/server/supabase';
import { ownOnly } from '../../../utils/server/caseMapping';
import { toChanges, fromRow } from '../../../utils/server/vehicleMapping';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (!dbConfigured()) {
    return res.status(503).json({ code: 'db_not_configured', message: 'Datenbank ist nicht konfiguriert.' });
  }
  const session = await requireAuth(req, res, { strict: true });
  if (!session) return;

  const { id } = req.query;
  if (!UUID.test(id)) return res.status(400).json({ message: 'Ungültige ID.' });

  try {
    if (req.method === 'PATCH') {
      const changes = toChanges(req.body);
      if (!Object.keys(changes).length) return res.status(400).json({ message: 'Keine Änderungen.' });
      const rows = await db(`vehicles?id=eq.${id}${ownOnly(session)}`, {
        method: 'PATCH',
        body: { ...changes, updated_at: new Date().toISOString() },
        prefer: 'return=representation'
      });
      if (!rows.length) return res.status(404).json({ message: 'Fahrzeug nicht gefunden.' });
      return res.status(200).json({ vehicle: fromRow(rows[0]) });
    }

    if (req.method === 'DELETE') {
      const rows = await db(`vehicles?id=eq.${id}${ownOnly(session)}`, { method: 'DELETE', prefer: 'return=representation' });
      if (!rows.length) return res.status(404).json({ message: 'Fahrzeug nicht gefunden.' });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    return sendDbError(res, error);
  }
}
