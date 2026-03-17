module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || '127.0.0.1').split(',')[0].trim();
  const rateLimitKey = `rl:create:${ip}`;
  const count = await redisCommand(['INCR', rateLimitKey]);
  if (count === 1) await redisCommand(['EXPIRE', rateLimitKey, '60']);
  if (count > 10) return res.status(429).json({ error: 'Too many requests' });

  try {
    const splitData = req.body;
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const id = Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('');

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
