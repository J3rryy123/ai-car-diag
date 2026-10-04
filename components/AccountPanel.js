import React, { useCallback, useEffect, useState } from 'react';
import styles from '../styles/KFZDiagnosePlatform.module.css';

async function api(path, method, body) {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Fehler (HTTP ${response.status})`);
  return data;
}

const ChangePassword = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await api('/api/auth/password', 'POST', form);
      setForm({ currentPassword: '', newPassword: '' });
      setMessage('Passwort geändert. Auf anderen Geräten ist eine neue Anmeldung nötig.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={submit}>
      <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Passwort ändern</h3>
      <input className={styles.input} type="password" placeholder="Aktuelles Passwort" autoComplete="current-password"
        value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
      <input className={styles.input} type="password" placeholder="Neues Passwort (mind. 8 Zeichen)" autoComplete="new-password"
        value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} style={{ marginTop: '0.5rem' }} />
      {error && <div className={styles.error} style={{ marginTop: '0.5rem' }}>⚠️ {error}</div>}
      {message && <p style={{ color: '#047857', marginTop: '0.5rem' }}>{message}</p>}
      <button className={styles.button} type="submit" disabled={!form.currentPassword || !form.newPassword} style={{ marginTop: '0.5rem' }}>
        Passwort speichern
      </button>
    </form>
  );
};

const UserAdmin = ({ currentUserId }) => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ username: '', displayName: '', password: '', role: 'user' });

  const refresh = useCallback(async () => {
    try {
      setUsers((await api('/api/users', 'GET')).users);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (action) => {
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const create = (event) => {
    event.preventDefault();
    run(async () => {
      await api('/api/users', 'POST', form);
      setForm({ username: '', displayName: '', password: '', role: 'user' });
    });
  };

  const resetPassword = (user) => {
    const password = window.prompt(`Neues Passwort für ${user.username} (mind. 8 Zeichen):`);
    if (password) run(() => api(`/api/users/${user.id}`, 'PATCH', { password }));
  };

  const remove = (user) => {
    if (window.confirm(`Benutzer „${user.username}“ wirklich löschen? Bereits angelegte Fälle bleiben erhalten.`)) {
      run(() => api(`/api/users/${user.id}`, 'DELETE'));
    }
  };

  const small = { padding: '0.25rem 0.6rem', fontSize: '0.8rem', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' };

  return (
    <div>
      <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Benutzerverwaltung</h3>
      {error && <div className={styles.error}>⚠️ {error}</div>}
      <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
        {users.map((u) => (
          <div key={u.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.75rem', opacity: u.active ? 1 : 0.6 }}>
            <strong>{u.displayName}</strong> <span style={{ color: '#6b7280' }}>({u.username})</span>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
              {u.role === 'admin' ? '🛡️ Admin' : 'Mitarbeiter'}{!u.active && ' · deaktiviert'}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
              <button style={small} onClick={() => resetPassword(u)}>Passwort setzen</button>
              {u.id !== currentUserId && (
                <>
                  <button style={small} onClick={() => run(() => api(`/api/users/${u.id}`, 'PATCH', { role: u.role === 'admin' ? 'user' : 'admin' }))}>
                    {u.role === 'admin' ? 'Zum Mitarbeiter machen' : 'Zum Admin machen'}
                  </button>
                  <button style={small} onClick={() => run(() => api(`/api/users/${u.id}`, 'PATCH', { active: !u.active }))}>
                    {u.active ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <button style={{ ...small, color: '#dc2626' }} onClick={() => remove(u)}>Löschen</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={create}>
        <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Neuen Benutzer anlegen</h4>
        <input className={styles.input} placeholder="Benutzername (a–z, 0–9, . _ -)" autoCapitalize="none" autoComplete="off"
          value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input className={styles.input} placeholder="Anzeigename (optional)" autoComplete="off"
          value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} style={{ marginTop: '0.5rem' }} />
        <input className={styles.input} type="password" placeholder="Startpasswort (mind. 8 Zeichen)" autoComplete="new-password"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ marginTop: '0.5rem' }} />
        <select className={styles.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ marginTop: '0.5rem' }}>
          <option value="user">Mitarbeiter</option>
          <option value="admin">Administrator</option>
        </select>
        <button className={styles.button} type="submit" disabled={!form.username || !form.password} style={{ marginTop: '0.5rem' }}>
          Benutzer anlegen
        </button>
      </form>
    </div>
  );
};

const AccountPanel = ({ user, onClose }) => (
  <div
    onClick={onClose}
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 70, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '2rem 1rem' }}
  >
    <div className={styles.card} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '32rem', display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className={styles.cardTitle} style={{ margin: 0 }}>👤 {user.displayName}</h2>
        <button onClick={onClose} aria-label="Schließen" style={{ border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
      </div>
      <ChangePassword />
      {user.role === 'admin' && <UserAdmin currentUserId={user.id} />}
    </div>
  </div>
);

export default AccountPanel;
