import { requireAuth, hashPassword, passwordProblem, publicUser } from '../../../utils/server/auth';
import { db, sendDbError } from '../../../utils/server/supabase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  const session = await requireAuth(req, res, { admin: true });
  if (!session) return;

  const { id } = req.query;
  if (!UUID.test(id)) return res.status(400).json({ message: 'Ungültige ID.' });
  const isSelf = id === session.user.id;

  try {
    const [target] = await db(`app_users?id=eq.${id}&select=*&limit=1`);
    if (!target) return res.status(404).json({ message: 'Benutzer nicht gefunden.' });

    if (req.method === 'PATCH') {
      const changes = {};
      const { displayName, role, active, password } = req.body || {};
      if (typeof displayName === 'string' && displayName.trim()) changes.display_name = displayName.trim().slice(0, 100);
      if (role === 'admin' || role === 'user') changes.role = role;
      if (typeof active === 'boolean') changes.active = active;
      if (password !== undefined) {
        const problem = passwordProblem(password);
        if (problem) return res.status(400).json({ message: problem });
        changes.password_hash = await hashPassword(password);
      }
      if (!Object.keys(changes).length) return res.status(400).json({ message: 'Keine Änderungen.' });
      if (isSelf && (changes.active === false || changes.role === 'user')) {
        return res.status(400).json({ message: 'Das eigene Konto kann nicht deaktiviert oder herabgestuft werden.' });
      }
      const [updated] = await db(`app_users?id=eq.${id}`, { method: 'PATCH', body: changes, prefer: 'return=representation' });
      return res.status(200).json({ user: publicUser(updated) });
    }

    if (req.method === 'DELETE') {
      // Eigenes Konto zu löschen würde ggf. den letzten Administrator entfernen
      if (isSelf) return res.status(400).json({ message: 'Das eigene Konto kann nicht gelöscht werden.' });
      await db(`app_users?id=eq.${id}`, { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    return sendDbError(res, error);
  }
}
