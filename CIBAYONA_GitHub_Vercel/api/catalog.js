const { callAppsScript } = require('../lib/apps-script');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido.' });
  }
  try {
    const data = await callAppsScript('publicCatalog');
    // La hoja de Google es la fuente principal; no mantener respuestas antiguas en caché.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(200).json(data);
  } catch (error) {
    console.error('CIBAYONA catalog:', error.message);
    return res.status(502).json({ error: error.message || 'No se pudo cargar el catálogo.' });
  }
};
