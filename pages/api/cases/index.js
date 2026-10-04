import { requireAuth } from '../../../utils/server/auth';
import { db, dbConfigured, sendDbError } from '../../../utils/server/supabase';
import { toRow, fromRow } from '../../../utils/server/caseMapping';

const LIST_LIMIT = 200;

export default async function handler(req, res) {
  if (!dbConfigured()) {
    return res.status(503).json({ code: 'db_not_configured', message: 'Datenbank ist nicht konfiguriert.' });
  }
  if (!requireAuth(req, res, { strict: true })) return;

  try {
    if (req.method === 'GET') {
      const rows = await db(`cases?select=*&order=created_at.desc&limit=${LIST_LIMIT}`);
      return res.status(200).json({ cases: rows.map(fromRow) });
    }

    if (req.method === 'POST') {
      const input = Array.isArray(req.body?.cases) ? req.body.cases.slice(0, LIST_LIMIT) : [req.body];
      const rows = input.map(toRow).filter(Boolean);
      if (!rows.length) return res.status(400).json({ message: 'Ungültiger Fall.' });
      const saved = await db('cases', { method: 'POST', body: rows, prefer: 'return=representation' });
      return res.status(201).json({ cases: saved.map(fromRow) });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    return sendDbError(res, error);
  }
}
