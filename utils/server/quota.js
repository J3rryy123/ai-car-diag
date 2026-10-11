import { db, dbConfigured } from './supabase';

// Monatsgrenze für KI-Anfragen (Analyse und Fahrzeugschein-Scan) je Abo-Konto, schützt vor unbegrenzten Kosten.
// MONTHLY_ANALYSIS_LIMIT=0 (Standard) bedeutet unbegrenzt. Mitarbeiter und Administratoren sind nie begrenzt.
// Gezählt wird pro Kalendermonat (UTC) atomar in der Datenbank (Funktion usage_add, Tabelle usage_counters).
export const monthlyLimit = () => {
  const limit = Number.parseInt(process.env.MONTHLY_ANALYSIS_LIMIT ?? '', 10);
  return Number.isInteger(limit) && limit > 0 ? limit : 0;
};

export const quotaApplies = (user) => !!user && user.account_type === 'subscriber' && monthlyLimit() > 0 && dbConfigured();

export const currentPeriod = (now = new Date()) => now.toISOString().slice(0, 7);
export const nextReset = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

const add = (user, delta) =>
  db('rpc/usage_add', {
    method: 'POST',
    body: { p_user: user.id, p_period: currentPeriod(), p_delta: delta, p_limit: monthlyLimit() },
    timeoutMs: 2000
  });

/**
 * Reserviert eine Anfrage. Liefert { allowed, used, limit }; ohne Begrenzung immer erlaubt.
 * Ist die Funktion noch nicht eingespielt oder die Datenbank gestört, bleibt der Dienst erreichbar (Hinweis im Log).
 */
export async function reserveRequest(user) {
  if (!quotaApplies(user)) return { allowed: true, limited: false };
  const limit = monthlyLimit();
  try {
    const used = await add(user, 1);
    if (!Number.isInteger(used)) throw new Error('unerwartete Antwort');
    return used === -1 ? { allowed: false, limited: true, used: limit, limit } : { allowed: true, limited: true, used, limit };
  } catch (error) {
    console.warn(`Monatsgrenze nicht verfügbar (${error.code || error.message}), Anfrage wird zugelassen.`);
    return { allowed: true, limited: false };
  }
}

/** Gibt eine reservierte Anfrage zurück, wenn kein KI-Aufruf stattgefunden hat oder er fehlgeschlagen ist. */
export async function releaseRequest(user, reservation) {
  if (!reservation?.limited) return;
  try {
    await add(user, -1);
  } catch (error) {
    console.warn('Anfrage konnte nicht zurückgegeben werden:', error.code || error.message);
  }
}

/** Verbrauch im laufenden Monat für die Anzeige (null, wenn keine Grenze gilt). */
export async function getUsage(user) {
  if (!quotaApplies(user)) return null;
  const limit = monthlyLimit();
  let used = 0;
  try {
    const rows = await db(`usage_counters?user_id=eq.${user.id}&period=eq.${currentPeriod()}&select=hits&limit=1`, { timeoutMs: 2000 });
    used = rows[0]?.hits ?? 0;
  } catch (error) {
    console.warn('Verbrauch nicht lesbar:', error.code || error.message);
    return null;
  }
  return { used: Math.min(used, limit), limit, resetsAt: nextReset() };
}

export const quotaExceeded = (res, reservation) =>
  res.status(429).json({
    code: 'quota_exceeded',
    message: `Das Monatskontingent von ${reservation.limit} KI-Anfragen ist aufgebraucht. Es setzt sich zum 1. des nächsten Monats zurück.`
  });
