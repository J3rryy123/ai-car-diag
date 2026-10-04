// Gemeinsamer Zugang zur Claude-API: Zeitlimit, Wiederholung bei Überlastung, erzwungener Tool-Aufruf.
// `content` ist ein Text oder eine Liste von Inhaltsblöcken (z. B. Bild + Text).
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';

// Zeitbudget für einen Claude-Aufruf inkl. Wiederholungen (unter maxDuration)
const CLAUDE_TOTAL_BUDGET_MS = 52 * 1000;
const CLAUDE_ATTEMPT_TIMEOUT_MS = 28 * 1000;
const CLAUDE_MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504, 529]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Ein Aufruf mit Zeitlimit; wirft Fehler mit `retryable`-Flag
async function callClaudeOnce(content, tool, timeoutMs) {
  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content }],
        // Antwort erzwingt das Tool → garantiert strukturiertes Ergebnis
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    const err = new Error(timedOut ? 'Claude hat nicht rechtzeitig geantwortet' : `Claude nicht erreichbar (${error.message})`);
    err.retryable = true;
    throw err;
  }
  if (!response.ok) {
    console.error('Claude API error:', response.status, await response.text());
    const err = new Error(`Claude API Fehler (HTTP ${response.status})`);
    err.retryable = RETRYABLE_STATUS.has(response.status);
    err.retryAfterMs = Number(response.headers.get('retry-after')) * 1000 || 0;
    throw err;
  }
  const data = await response.json();
  if (data.stop_reason === 'max_tokens') console.warn('Claude API: Antwort wegen max_tokens abgeschnitten');

  const blocks = data.content || [];
  const toolInput = blocks.find((b) => b?.type === 'tool_use' && b.input && typeof b.input === 'object')?.input;
  // Antwort kann mehrere Blöcke enthalten (z. B. Denkblock vor dem Text) – alle Textblöcke zusammenfügen
  const text = blocks
    .filter((b) => b?.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n');
  if (!toolInput && !text.trim()) {
    console.error('Claude API: leere Antwort', { stop_reason: data.stop_reason, blocks: blocks.map((b) => b?.type) });
    throw new Error(`Claude hat keine Antwort geliefert (${data.stop_reason || 'unbekannter Grund'})`);
  }
  return { toolInput, content: text, model: CLAUDE_MODEL };
}

// Mit Wiederholung bei Überlastung/Zeitüberschreitung, solange das Zeitbudget reicht
export async function callClaude(content, tool) {
  const startedAt = Date.now();
  let lastError;
  for (let attempt = 1; attempt <= CLAUDE_MAX_ATTEMPTS; attempt++) {
    const remaining = CLAUDE_TOTAL_BUDGET_MS - (Date.now() - startedAt);
    if (remaining < 5000) break;
    try {
      return await callClaudeOnce(content, tool, Math.min(CLAUDE_ATTEMPT_TIMEOUT_MS, remaining));
    } catch (error) {
      lastError = error;
      if (!error.retryable || attempt === CLAUDE_MAX_ATTEMPTS) break;
      await sleep(Math.min(error.retryAfterMs || 1000 * attempt, 5000));
    }
  }
  throw lastError || new Error('Claude hat nicht rechtzeitig geantwortet');
}

