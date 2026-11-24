const GAS_URL = process.env.APPS_SCRIPT_URL;
const API_SECRET = process.env.API_SECRET;

async function callAppsScript(action, data = {}) {
  if (!GAS_URL || !API_SECRET) {
    throw new Error('Faltan APPS_SCRIPT_URL o API_SECRET en las variables de entorno de Vercel.');
  }
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, secret: API_SECRET, data })
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); }
  catch (_) { throw new Error('Apps Script no devolvió JSON. Verifica que la URL sea la implementación /exec.'); }
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `Error de Apps Script (${response.status}).`);
  }
  return payload.data;
}

module.exports = { callAppsScript };
