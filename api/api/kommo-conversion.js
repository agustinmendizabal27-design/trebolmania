export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = req.body;
    const leadsUpdate = body?.leads?.update;
    if (!leadsUpdate || !leadsUpdate.length) {
      return res.status(200).json({ status: 'no_update' });
    }
    const ETAPA_CARGA_CONFIRMADA = process.env.KOMMO_STAGE_ID;
    for (const lead of leadsUpdate) {
      const statusId = lead.status_id?.toString();
      if (statusId === ETAPA_CARGA_CONFIRMADA) {
        const valor = parseFloat(lead.price) || 0;
        await dispararPurchase(valor);
      }
    }
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Kommo webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
async function dispararPurchase(valor) {
  const pixelId = process.env.FB_PIXEL_ID;
  const accessToken = process.env.FB_ACCESS_TOKEN;
  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'crm',
      event_source_url: 'https://trebolmania-gules.vercel.app/',
      user_data: {
        client_user_agent: 'Kommo CRM'
      },
      custom_data: {
        value: valor,
        currency: 'ARS'
      }
    }]
  };
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );
  return response.json();
}
