const { callAppsScript } = require('../lib/apps-script');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido.' });
  }
  try {
    const data = await callAppsScript('publicCatalog');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (error) {
    console.error('CIBAYONA catalog:', error.message);
    return res.status(502).json({ error: error.message || 'No se pudo cargar el catálogo.' });
  }
};
