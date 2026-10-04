import React, { useEffect, useState } from 'react';
import AccountPanel from './AccountPanel';
import styles from '../styles/KFZDiagnosePlatform.module.css';

async function post(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Anmeldung fehlgeschlagen.');
  return data;
}

// Zeigt die App erst nach der Anmeldung. Modi (vom Server): 'users' = Benutzerverwaltung,
// 'legacy' = gemeinsames Passwort (APP_PASSWORD), 'open' = ohne Schutz.
const AuthGate = ({ children }) => {
  const [state, setState] = useState({ checked: false });
  const [form, setForm] = useState({ username: '', displayName: '', password: '', setupCode: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const loadState = () =>
    fetch('/api/auth')
      .then((r) => r.json())
      .then((data) => setState({ checked: true, ...data }))
      .catch(() => setState({ checked: true, mode: 'open', authenticated: true }));

  useEffect(() => {
    loadState();
  }, []);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (state.setupRequired) await post('/api/auth/setup', form);
      else await post('/api/auth', state.mode === 'legacy' ? { password: form.password } : form);
      setForm({ username: '', displayName: '', password: '', setupCode: '' });
      await loadState();
    } catch (err) {
      setError(err.message || 'Server nicht erreichbar.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setAccountOpen(false);
    await loadState();
  };

  if (!state.checked) return null;

  if (!state.authenticated) {
    const setup = state.setupRequired;
    const users = state.mode === 'users';
    return (
      <div className={styles.container}>
        <main className={styles.main} style={{ maxWidth: '28rem', margin: '4rem auto' }}>
          <form className={styles.card} onSubmit={submit}>
            <h2 className={styles.cardTitle}>{setup ? '👤 Ersteinrichtung' : '🔒 Anmeldung'}</h2>
            {setup && (
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                Noch kein Benutzer vorhanden. Lege den ersten Administrator an – weitere Personen kannst du danach selbst hinzufügen.
              </p>
            )}
            {users && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="auth-username">Benutzername</label>
                <input className={styles.input} id="auth-username" autoFocus autoComplete="username" autoCapitalize="none"
                  value={form.username} onChange={set('username')} />
              </div>
            )}
            {setup && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="auth-name">Anzeigename (optional)</label>
                <input className={styles.input} id="auth-name" autoComplete="name" value={form.displayName} onChange={set('displayName')} />
              </div>
            )}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="auth-password">Passwort</label>
              <input className={styles.input} id="auth-password" type="password" autoFocus={!users}
                autoComplete={setup ? 'new-password' : 'current-password'} value={form.password} onChange={set('password')} />
            </div>
            {setup && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="auth-setup">Einrichtungscode (Wert von APP_PASSWORD, falls gesetzt)</label>
                <input className={styles.input} id="auth-setup" type="password" autoComplete="off" value={form.setupCode} onChange={set('setupCode')} />
              </div>
            )}
            {error && <div className={styles.error}>⚠️ {error}</div>}
            <button className={styles.button} type="submit" disabled={busy || !form.password || (users && !form.username)}>
              {setup ? 'Administrator anlegen' : 'Anmelden'}
            </button>
          </form>
        </main>
      </div>
    );
  }

  const barButton = { padding: '0.35rem 0.7rem', fontSize: '0.8rem', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' };

  return (
    <>
      {children}
      {state.authRequired && (
        <div style={{ position: 'fixed', right: '0.5rem', top: '0.5rem', zIndex: 60, display: 'flex', gap: '0.4rem' }}>
          {state.user && (
            <button onClick={() => setAccountOpen(true)} style={barButton}>
              👤 {state.user.displayName}
            </button>
          )}
          <button onClick={logout} style={barButton}>Abmelden</button>
        </div>
      )}
      {accountOpen && state.user && <AccountPanel user={state.user} onClose={() => setAccountOpen(false)} />}
    </>
  );
};

export default AuthGate;
