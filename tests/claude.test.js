import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callClaude } from '../utils/server/claude';

const TOOL = { name: 'report_diagnosis', description: 'x', input_schema: { type: 'object', properties: {} } };
const ok = (content, extra = {}) =>
  new Response(JSON.stringify({ stop_reason: 'tool_use', content, ...extra }), { status: 200, headers: { 'content-type': 'application/json' } });
const failure = (status, headers = {}) => new Response(JSON.stringify({ error: { message: 'boom' } }), { status, headers });

beforeEach(() => {
  vi.stubEnv('CLAUDE_API_KEY', 'test-key');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const sentBody = (fetchMock, call = 0) => JSON.parse(fetchMock.mock.calls[call][1].body);

describe('Anfrage an die Claude-API', () => {
  it('sendet Tool mit tool_choice "auto" (erzwungene Tool-Wahl lehnen aktuelle Modelle mit HTTP 400 ab)', async () => {
    const fetchMock = vi.fn(async () => ok([{ type: 'tool_use', input: { diagnosis: 'x' } }]));
    vi.stubGlobal('fetch', fetchMock);
    await callClaude('Frage', TOOL);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options.headers['x-api-key']).toBe('test-key');
    expect(options.headers['anthropic-version']).toBe('2023-06-01');

    const body = sentBody(fetchMock);
    expect(body.tool_choice).toEqual({ type: 'auto' });
    expect(body.tool_choice.type).not.toMatch(/^(tool|any)$/);
    expect(body.tools).toEqual([TOOL]);
    expect(body.system).toContain('report_diagnosis'); // Tool-Aufruf wird per Anweisung verlangt
    expect(body.messages).toEqual([{ role: 'user', content: 'Frage' }]);
  });

  it('lässt Platz für das Nachdenken (max_tokens) und setzt die Denktiefe', async () => {
    const fetchMock = vi.fn(async () => ok([{ type: 'tool_use', input: {} }]));
    vi.stubGlobal('fetch', fetchMock);
    await callClaude('a', TOOL);
    await callClaude('b', TOOL, { effort: 'low' });
    expect(sentBody(fetchMock, 0)).toMatchObject({ max_tokens: 16000, output_config: { effort: 'medium' } });
    expect(sentBody(fetchMock, 1).output_config).toEqual({ effort: 'low' });
  });

  it('reicht Inhaltsblöcke (Bild + Text) unverändert weiter', async () => {
    const fetchMock = vi.fn(async () => ok([{ type: 'tool_use', input: {} }]));
    vi.stubGlobal('fetch', fetchMock);
    const content = [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }, { type: 'text', text: 'lies' }];
    await callClaude(content, TOOL);
    expect(sentBody(fetchMock).messages[0].content).toEqual(content);
  });
});

describe('Antwort', () => {
  it('liefert die Tool-Eingabe, auch nach Denk- und Textblöcken', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      ok([{ type: 'thinking', thinking: '' }, { type: 'text', text: 'Hier das Ergebnis' }, { type: 'tool_use', input: { diagnosis: 'ok' } }])
    ));
    const result = await callClaude('x', TOOL);
    expect(result.toolInput).toEqual({ diagnosis: 'ok' });
    expect(result.content).toBe('Hier das Ergebnis');
  });

  it('liefert Text, wenn das Modell kein Tool aufruft', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok([{ type: 'text', text: '{"diagnosis":"aus Text"}' }], { stop_reason: 'end_turn' })));
    const result = await callClaude('x', TOOL);
    expect(result.toolInput).toBeUndefined();
    expect(result.content).toContain('aus Text');
  });

  it('meldet eine komplett leere Antwort als Fehler mit Grund', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok([], { stop_reason: 'refusal' })));
    await expect(callClaude('x', TOOL)).rejects.toThrow(/refusal/);
  });
});

describe('Fehler und Wiederholung', () => {
  // Wartezeiten zwischen den Versuchen überspringen (nur setTimeout, das Zeitlimit der Anfrage bleibt echt)
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout'] }));
  afterEach(() => vi.useRealTimers());
  const run = async (promise) => {
    const settled = promise.then((value) => ({ value }), (error) => ({ error }));
    await vi.runAllTimersAsync();
    const outcome = await settled;
    if (outcome.error) throw outcome.error;
    return outcome.value;
  };

  it('wiederholt bei Überlastung (529) und gibt dann das Ergebnis zurück', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(failure(529, { 'retry-after': '0' }))
      .mockResolvedValueOnce(failure(529, { 'retry-after': '0' }))
      .mockResolvedValueOnce(ok([{ type: 'tool_use', input: { diagnosis: 'nach Wiederholung' } }]));
    vi.stubGlobal('fetch', fetchMock);
    const result = await run(callClaude('x', TOOL));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.toolInput.diagnosis).toBe('nach Wiederholung');
  });

  it('wiederholt nicht bei Anfragefehlern (400, 401, 404) und nennt den Statuscode', async () => {
    for (const status of [400, 401, 404]) {
      const fetchMock = vi.fn(async () => failure(status));
      vi.stubGlobal('fetch', fetchMock);
      await expect(run(callClaude('x', TOOL))).rejects.toThrow(`HTTP ${status}`);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it('gibt nach 3 erfolglosen Versuchen auf', async () => {
    const fetchMock = vi.fn(async () => failure(529, { 'retry-after': '0' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(run(callClaude('x', TOOL))).rejects.toThrow('HTTP 529');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('behandelt Netzwerkfehler als wiederholbar', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce(ok([{ type: 'tool_use', input: { diagnosis: 'ok' } }]));
    vi.stubGlobal('fetch', fetchMock);
    expect((await run(callClaude('x', TOOL))).toolInput.diagnosis).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
