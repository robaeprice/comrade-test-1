module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const ip = (req.headers['x-forwarded-for'] || '127.0.0.1').split(',')[0].trim();
  const rateLimitKey = `rl:read:${ip}`;
  const countResult = await redisCommand(['INCR', rateLimitKey]);
  const count = countResult.result;
  await redisCommand(['EXPIRE', rateLimitKey, '60']);
  if (count > 30) return res.status(429).json({ error: 'Too many requests' });
  const { id } = req.query;
  if (req.method === 'GET') {
    try {
      const result = await redisCommand(['GET', id]);
      if (!result.result) return res.status(404).json({ error: 'Split not found' });
      const data = JSON.parse(result.result);
      return res.status(200).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch split' });
    }
  }
  if (req.method === 'POST') {
    try {
      const { version: clientVersion, ...splitData } = req.body;
      const result = await redisCommand(['GET', id]);
      if (!result.result) return res.status(404).json({ error: 'Split not found' });
      const current = JSON.parse(result.result);
      if (current.version !== clientVersion) {
        return res.status(409).json({ error: 'Conflict', currentVersion: current.version });
      }
      const blob = {
        ...splitData,
        version: current.version + 1,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString()
      };
      await redisCommand(['SET', id, JSON.stringify(blob), 'EX', '2592000']);
      return res.status(200).json({ version: blob.version });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update split' });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
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
