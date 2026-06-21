export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { event_name, event_time, client_ip, client_user_agent, fbp, fbc } = req.body;

  const pixelId = process.env.FB_PIXEL_ID;
  const accessToken = process.env.FB_ACCESS_TOKEN;

  const payload = {
    data: [{
      event_name: event_name || 'Lead',
      event_time: event_time || Math.floor(Date.now() / 1000),
      action_source: 'website',
      client_ip_address: client_ip || '',
      client_user_agent: client_user_agent || '',
      event_source_url: 'https://agustinmendizabal27-design.github.io/trebolmania/',
      user_data: {
        fbp: fbp || '',
        fbc: fbc || ''
      }
    }]
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
