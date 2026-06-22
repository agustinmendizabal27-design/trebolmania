import crypto from 'crypto';

function hashSHA256(value) {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

async function getLeadContact(leadId) {
  const kommoToken = process.env.KOMMO_TOKEN;
  const kommoDomain = process.env.KOMMO_DOMAIN; // casinoestrella001.kommo.com

  try {
    const resLead = await fetch(
      `https://${kommoDomain}/api/v4/leads/${leadId}?with=contacts`,
      { headers: { Authorization: `Bearer ${kommoToken}` } }
    );
    const rawLead = await resLead.text();
    if (!rawLead || rawLead.trim() === '') return {};
    const lead = JSON.parse(rawLead);

    const contactId = lead?._embedded?.contacts?.[0]?.id;
    if (!contactId) return {};

    const resContact = await fetch(
      `https://${kommoDomain}/api/v4/contacts/${contactId}`,
      { headers: { Authorization: `Bearer ${kommoToken}` } }
    );
    const rawContact = await resContact.text();
    if (!rawContact || rawContact.trim() === '') return {};
    const contact = JSON.parse(rawContact);

    const phoneField = contact?.custom_fields_values?.find(f => f.field_code === 'PHONE');
    const phone = (phoneField?.values?.[0]?.value || '').replace(/\D/g, '');

    const emailField = contact?.custom_fields_values?.find(f => f.field_code === 'EMAIL');
    const email = emailField?.values?.[0]?.value || '';

    console.log('Teléfono:', phone);
    return { phone, email };

  } catch (error) {
    console.error('Error Kommo:', error);
    return {};
  }
}

async function dispararPurchase(valor, leadData = {}) {
  const pixelId = process.env.FB_PIXEL_ID;
  const accessToken = process.env.FB_ACCESS_TOKEN;

  const user_data = {
    client_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  };

  if (leadData.phone) user_data.ph = hashSHA256(leadData.phone);
  if (leadData.email) user_data.em = hashSHA256(leadData.email);

  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: 'https://agustinmendizabal27-design.github.io/trebolmania/',
      user_data,
      custom_data: {
        value: valor,
        currency: 'ARS'
      }
    }]
  };

  console.log('Payload Meta:', JSON.stringify(payload));

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );
  const result = await response.json();
  console.log('Respuesta Meta:', JSON.stringify(result));
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;
    const ETAPA_CARGA_CONFIRMADA = process.env.KOMMO_STAGE_ID;
    let disparado = false;

    for (const key of Object.keys(body)) {
      if (key.match(/leads\[update\]\[\d+\]\[status_id\]/)) {
        const statusId = body[key]?.toString();
        if (statusId === ETAPA_CARGA_CONFIRMADA) {
          const index = key.match(/leads\[update\]\[(\d+)\]/)[1];
          const leadId = body[`leads[update][${index}][id]`];
          const valor = parseFloat(body[`leads[update][${index}][price]`]) || 0;

          console.log('Lead ID:', leadId, '| Valor:', valor);

          const leadData = await getLeadContact(leadId);
          await dispararPurchase(valor, leadData);
          disparado = true;
        }
      }
    }

    if (!disparado) console.log('Ningún lead coincide con la etapa');
    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
