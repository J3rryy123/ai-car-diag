import { requireAuth } from '../../../utils/server/auth';
import { db, dbConfigured, sendDbError } from '../../../utils/server/supabase';
import { fromRow, clip } from '../../../utils/server/caseMapping';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (!dbConfigured()) {
    return res.status(503).json({ code: 'db_not_configured', message: 'Datenbank ist nicht konfiguriert.' });
  }
  if (!requireAuth(req, res, { strict: true })) return;

  const { id } = req.query;
  if (!UUID.test(id)) return res.status(400).json({ message: 'Ungültige ID.' });

  try {
    if (req.method === 'PATCH') {
      const changes = {};
      if (typeof req.body?.customer === 'string') changes.customer = clip(req.body.customer, 200);
      if (typeof req.body?.note === 'string') changes.note = clip(req.body.note, 5000);
      if (!Object.keys(changes).length) return res.status(400).json({ message: 'Keine Änderungen.' });
      const rows = await db(`cases?id=eq.${id}`, { method: 'PATCH', body: changes, prefer: 'return=representation' });
      if (!rows.length) return res.status(404).json({ message: 'Fall nicht gefunden.' });
      return res.status(200).json({ case: fromRow(rows[0]) });
    }

    if (req.method === 'DELETE') {
      await db(`cases?id=eq.${id}`, { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    return sendDbError(res, error);
  }
}
