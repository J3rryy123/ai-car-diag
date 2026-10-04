import { requireAuth, hashPassword, passwordProblem, publicUser, findUserByName, USERNAME_PATTERN } from '../../../utils/server/auth';
import { db, sendDbError } from '../../../utils/server/supabase';

export default async function handler(req, res) {
  const session = await requireAuth(req, res, { admin: true });
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const rows = await db('app_users?select=*&order=created_at.asc');
      return res.status(200).json({ users: rows.map(publicUser) });
    }

    if (req.method === 'POST') {
      const username = String(req.body?.username ?? '').trim().toLowerCase();
      const displayName = String(req.body?.displayName ?? '').trim().slice(0, 100) || username;
      const role = req.body?.role === 'admin' ? 'admin' : 'user';
      if (!USERNAME_PATTERN.test(username)) {
        return res.status(400).json({ message: 'Benutzername: 3–32 Zeichen (a–z, 0–9, Punkt, Unterstrich, Bindestrich).' });
      }
      const problem = passwordProblem(req.body?.password);
      if (problem) return res.status(400).json({ message: problem });
      if (await findUserByName(username)) return res.status(409).json({ message: 'Benutzername ist bereits vergeben.' });

      const [user] = await db('app_users', {
        method: 'POST',
        body: { username, display_name: displayName, password_hash: await hashPassword(req.body.password), role },
        prefer: 'return=representation'
      });
      return res.status(201).json({ user: publicUser(user) });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    return sendDbError(res, error);
  }
}
