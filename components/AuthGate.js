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

const emptyForm = { username: '', displayName: '', password: '', setupCode: '', email: '', acceptTerms: false };
const muted = { color: '#9ca3af', marginBottom: '1rem' };

const LegalLink = ({ href, children }) =>
  href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>{children}</a> : <>{children}</>;

// Zeigt die App erst nach der Anmeldung. Modi (vom Server): 'users' = Benutzerverwaltung,
// 'legacy' = gemeinsames Passwort (APP_PASSWORD), 'open' = ohne Schutz.
const AuthGate = ({ children }) => {
  const [state, setState] = useState({ checked: false });
  const [form, setForm] = useState(emptyForm);
  const [signup, setSignup] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const loadState = () =>
    fetch('/api/auth')
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.message || `Serverfehler (HTTP ${r.status})`);
        return data;
      })
      .then((data) => setState({ checked: true, ...data }))
      .catch((err) => setState({ checked: true, loadError: err.message }));

  useEffect(() => {
    loadState();
  }, []);

  // Nach der Bezahlung bei Stripe kommt die Bestätigung per Webhook, meist binnen Sekunden: kurz nachfragen
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('checkout')) return undefined;
    const success = new URLSearchParams(window.location.search).get('checkout') === 'success';
    window.history.replaceState(null, '', window.location.pathname);
    if (!success) return undefined;
    setConfirming(true);
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      await loadState();
      if (tries >= 15) {
        clearInterval(timer);
        setConfirming(false);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state.user?.hasAccess) setConfirming(false);
  }, [state.user?.hasAccess]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  // Weiterleitung zu Stripe (Bezahlseite bzw. Kundenportal)
  const redirectTo = async (path) => {
    setBusy(true);
    setError(null);
    try {
      window.location.href = (await post(path, {})).url;
    } catch (err) {
      setError(err.message || 'Server nicht erreichbar.');
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (signup && !state.setupRequired) {
        const result = await post('/api/auth/register', form);
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
          return;
        }
      } else if (state.setupRequired) await post('/api/auth/setup', form);
      else await post('/api/auth', state.mode === 'legacy' ? { password: form.password } : form);
      setForm(emptyForm);
      setSignup(false);
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
    setError(null);
    await loadState();
  };

  if (!state.checked) return null;

  if (state.loadError) {
    return (
      <div className={styles.container}>
        <main className={styles.main} style={{ maxWidth: '28rem', margin: '4rem auto' }}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>⚠️ Anmeldung nicht möglich</h2>
            <div className={styles.error}>{state.loadError}</div>
            <button className={styles.button} style={{ marginTop: '1rem' }} onClick={loadState}>Erneut versuchen</button>
          </div>
        </main>
      </div>
    );
  }

  // Abo-Konto ohne laufendes Abo: erst bezahlen (bzw. Bestätigung abwarten)
  if (state.authenticated && state.user && !state.user.hasAccess) {
    const { billing } = state;
    const canceled = ['canceled', 'unpaid', 'incomplete_expired'].includes(state.user.subscriptionStatus);
    return (
      <div className={styles.container}>
        <main className={styles.main} style={{ maxWidth: '28rem', margin: '4rem auto' }}>
          <img className={styles.logo} src="/logo.png" alt="Smart Repair Service" style={{ margin: '0 auto 1.5rem' }} />
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{confirming ? '⏳ Zahlung wird bestätigt …' : '💳 Abonnement erforderlich'}</h2>
            {confirming ? (
              <p style={muted}>Die Zahlung wird bestätigt. Das dauert nur einen Moment, die Seite aktualisiert sich automatisch.</p>
            ) : (
              <p style={muted}>
                {canceled ? 'Dein Abonnement ist beendet.' : 'Für dein Konto ist noch kein aktives Abonnement vorhanden.'}
                {billing?.priceLabel && <> Preis: <strong>{billing.priceLabel}</strong>.</>}
                {billing?.trialDays > 0 && !state.user.currentPeriodEnd && <> Die ersten {billing.trialDays} Tage sind kostenlos.</>}
              </p>
            )}
            {error && <div className={styles.error}>⚠️ {error}</div>}
            {!confirming && billing && (
              <button className={styles.button} disabled={busy} onClick={() => redirectTo('/api/billing/checkout')}>
                {canceled ? 'Abo erneut abschließen' : 'Jetzt abonnieren'}
              </button>
            )}
            {state.user.subscriptionStatus !== 'incomplete' && (
              <button className={styles.button} style={{ marginTop: '0.5rem' }} disabled={busy} onClick={() => redirectTo('/api/billing/portal')}>
                Rechnungen &amp; Zahlungsmittel
              </button>
            )}
            <button className={styles.button} style={{ marginTop: '0.5rem' }} onClick={logout}>Abmelden</button>
          </div>
        </main>
      </div>
    );
  }

  if (!state.authenticated) {
    const setup = state.setupRequired;
    const users = state.mode === 'users';
    const register = signup && state.signupEnabled && !setup;
    const { billing } = state;
    return (
      <div className={styles.container}>
        <main className={styles.main} style={{ maxWidth: '28rem', margin: '4rem auto' }}>
          <img className={styles.logo} src="/logo.png" alt="Smart Repair Service" style={{ margin: '0 auto 1.5rem' }} />
          <form className={styles.card} onSubmit={submit}>
            <h2 className={styles.cardTitle}>{setup ? '👤 Ersteinrichtung' : register ? '✨ Konto erstellen' : '🔒 Anmeldung'}</h2>
            {register && (
              <p style={muted}>
                Erstelle dein Konto und schließe danach das Abonnement ab.
                {billing?.priceLabel && <> Preis: <strong>{billing.priceLabel}</strong>.</>}
                {billing?.trialDays > 0 && <> Die ersten {billing.trialDays} Tage sind kostenlos.</>}
              </p>
            )}
            {setup && (
              <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
                Noch kein Benutzer vorhanden. Lege den ersten Administrator an – weitere Personen kannst du danach selbst hinzufügen.
              </p>
            )}
            {register && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="auth-email">E-Mail-Adresse</label>
                <input className={styles.input} id="auth-email" type="email" autoFocus autoComplete="email" autoCapitalize="none"
                  value={form.email} onChange={set('email')} />
              </div>
            )}
            {users && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="auth-username">Benutzername</label>
                <input className={styles.input} id="auth-username" autoFocus={!register} autoComplete="username" autoCapitalize="none"
                  value={form.username} onChange={set('username')} />
              </div>
            )}
            {(setup || register) && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="auth-name">Anzeigename (optional)</label>
                <input className={styles.input} id="auth-name" autoComplete="name" value={form.displayName} onChange={set('displayName')} />
              </div>
            )}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="auth-password">Passwort</label>
              <input className={styles.input} id="auth-password" type="password" autoFocus={!users}
                autoComplete={setup || register ? 'new-password' : 'current-password'} value={form.password} onChange={set('password')} />
            </div>
            {setup && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="auth-setup">Einrichtungscode (Wert von APP_PASSWORD, falls gesetzt)</label>
                <input className={styles.input} id="auth-setup" type="password" autoComplete="off" value={form.setupCode} onChange={set('setupCode')} />
              </div>
            )}
            {register && (
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', margin: '0 0 1rem', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={form.acceptTerms} onChange={set('acceptTerms')} style={{ marginTop: '0.2rem' }} />
                <span>
                  Ich akzeptiere die <LegalLink href={billing?.termsUrl}>Nutzungsbedingungen</LegalLink> und habe
                  die <LegalLink href={billing?.privacyUrl}>Datenschutzerklärung</LegalLink> gelesen.
                </span>
              </label>
            )}
            {error && <div className={styles.error}>⚠️ {error}</div>}
            <button className={styles.button} type="submit"
              disabled={busy || !form.password || (users && !form.username) || (register && (!form.email || !form.acceptTerms))}>
              {setup ? 'Administrator anlegen' : register ? 'Weiter zur Zahlung' : 'Anmelden'}
            </button>
            {state.signupEnabled && !setup && (
              <button type="button" onClick={() => { setSignup(!signup); setError(null); }}
                style={{ display: 'block', margin: '1rem auto 0', background: 'none', border: 'none', color: '#9ca3af', textDecoration: 'underline', cursor: 'pointer' }}>
                {register ? 'Schon ein Konto? Anmelden' : 'Noch kein Konto? Jetzt registrieren'}
              </button>
            )}
          </form>
          {(billing?.imprintUrl || billing?.privacyUrl) && (
            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: '#9ca3af' }}>
              {billing.imprintUrl && <LegalLink href={billing.imprintUrl}>Impressum</LegalLink>}
              {billing.imprintUrl && billing.privacyUrl && ' · '}
              {billing.privacyUrl && <LegalLink href={billing.privacyUrl}>Datenschutz</LegalLink>}
            </p>
          )}
        </main>
      </div>
    );
  }

  const barButton = { padding: '0.35rem 0.7rem', fontSize: '0.8rem', borderRadius: 8, border: '1px solid #3d4858', background: '#1a212b', color: '#e5e7eb', cursor: 'pointer' };

  return (
    <>
      {children}
      {state.authRequired && (
        <div style={{ position: 'fixed', right: '0.5rem', top: '0.5rem', zIndex: 60, display: 'flex', gap: '0.4rem' }}>
          {state.user && (
            <button onClick={() => setAccountOpen(true)} style={barButton}>
              👤 {state.user.displayName}
              {state.user.role === 'admin' && <span className="auth-bar-label"> · ⚙️ Benutzerverwaltung</span>}
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
