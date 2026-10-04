import React, { useEffect, useState } from 'react';
import styles from '../styles/KFZDiagnosePlatform.module.css';

// Zeigt die App erst nach der Anmeldung, wenn auf dem Server ein Passwort (APP_PASSWORD) gesetzt ist.
const AuthGate = ({ children }) => {
  const [state, setState] = useState({ checked: false, authRequired: false, authenticated: false });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((data) => setState({ checked: true, ...data }))
      .catch(() => setState({ checked: true, authRequired: false, authenticated: true }));
  }, []);

  const login = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (response.ok) {
        setState((prev) => ({ ...prev, authenticated: true }));
        setPassword('');
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.message || 'Anmeldung fehlgeschlagen.');
      }
    } catch {
      setError('Server nicht erreichbar.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setState((prev) => ({ ...prev, authenticated: false }));
  };

  if (!state.checked) return null;

  if (!state.authenticated) {
    return (
      <div className={styles.container}>
        <main className={styles.main} style={{ maxWidth: '28rem', margin: '4rem auto' }}>
          <form className={styles.card} onSubmit={login}>
            <h2 className={styles.cardTitle}>🔒 Anmeldung</h2>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="app-password">Passwort</label>
              <input
                className={styles.input}
                id="app-password"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <div className={styles.error}>⚠️ {error}</div>}
            <button className={styles.button} type="submit" disabled={busy || !password}>
              Anmelden
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <>
      {children}
      {state.authRequired && (
        <button
          onClick={logout}
          style={{ position: 'fixed', right: '1rem', bottom: '1rem', padding: '0.5rem 0.9rem', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}
        >
          Abmelden
        </button>
      )}
    </>
  );
};

export default AuthGate;
