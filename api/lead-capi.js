// Vercel serverless function — envia o evento "Lead" para a Meta Conversions API.
// O token fica em uma variável de ambiente (META_CAPI_TOKEN) configurada no
// painel da Vercel, nunca neste arquivo nem no repositório.

const PIXEL_ID = '1045407667990574';

function hash(value) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.wagneraraujo.adv.br');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const token = process.env.META_CAPI_TOKEN;
  if (!token) return res.status(500).json({ error: 'missing META_CAPI_TOKEN' });

  const body = req.body || {};
  const eventId = body.event_id || `lead_${Date.now()}`;
  const sourceUrl = body.url || 'https://www.wagneraraujo.adv.br/obrigado/';
  const fbp = body.fbp;
  const fbc = body.fbc;

  const userData = {
    client_ip_address: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress,
    client_user_agent: req.headers['user-agent'] || '',
  };
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;
  if (body.email) userData.em = [hash(body.email)];
  if (body.phone) userData.ph = [hash(body.phone.replace(/\D/g, ''))];

  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: sourceUrl,
        action_source: 'website',
        user_data: userData,
      },
    ],
  };

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v20.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(data);
    return res.status(200).json({ ok: true, event_id: eventId, fb: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
