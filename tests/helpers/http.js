// Minimale Anfrage-/Antwortobjekte für Aufrufe der API-Handler (pages/api/...) ohne Server.
export function mockReq({ method = 'POST', body, headers = {}, query = {}, ip = '203.0.113.1' } = {}) {
  return { method, body, headers: { 'x-forwarded-for': ip, ...headers }, query, socket: { remoteAddress: ip } };
}

export function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
    setHeader(name, value) {
      res.headers[name.toLowerCase()] = value;
      return res;
    },
  };
  return res;
}

export async function call(handler, options) {
  const res = mockRes();
  await handler(mockReq(options), res);
  return res;
}

// Aus der Set-Cookie-Antwort den Wert für den nächsten Request ("name=wert")
export const cookieFrom = (res) => (res.headers['set-cookie'] || '').split(';')[0];

let counter = 0;
// Eindeutige IP je Test, damit Zähler der Anfragebegrenzung nicht zwischen Tests wirken
export const uniqueIp = () => `198.51.100.${(counter = (counter % 250) + 1)}`;
