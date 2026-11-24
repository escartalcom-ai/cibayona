const { callAppsScript } = require('../lib/apps-script');

const ALLOWED_PAYMENT_METHODS = ['Yape/Plin', 'Efectivo', 'Transferencia Bancaria', 'POS'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido.' });
  }
  try {
    const body = req.body || {};
    const customer = body.customer || {};
    const items = Array.isArray(body.items) ? body.items : [];
    const whatsappNumber = String(process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');
    if (!whatsappNumber) {
      return res.status(500).json({ error: 'Falta configurar WHATSAPP_NUMBER en Vercel. No se registró la solicitud.' });
    }
    const name = String(customer.name || '').trim();
    const phone = String(customer.phone || '').trim();
    const paymentMethod = String(customer.paymentMethod || '').trim();
    if (!name || !phone || !ALLOWED_PAYMENT_METHODS.includes(paymentMethod) || !items.length) {
      return res.status(400).json({ error: 'Completa nombres y apellidos, WhatsApp, método de pago y agrega al menos un producto.' });
    }
    const data = await callAppsScript('createOrder', { customer: { name, phone, paymentMethod, notes: String(customer.notes || '').trim() }, items });
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(data.whatsappText || '')}`;
    return res.status(200).json({ orderId: data.orderId, whatsappUrl });
  } catch (error) {
    console.error('CIBAYONA order:', error.message);
    return res.status(502).json({ error: error.message || 'No se pudo registrar la solicitud.' });
  }
};
