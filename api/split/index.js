module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const splitData = req.body;
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const id = Array.from({length: 12}, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    const blob = {
      ...splitData,
      version: 1,
      createdAt: new Date().toISOString()
    };

    await redisCommand(['SET', id, JSON.stringify(blob), 'EX', '2592000']);
    return res.status(200).json({ id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create split' });
  }
};

async function redisCommand(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  return response.json();
}
