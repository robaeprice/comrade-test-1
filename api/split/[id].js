const { Ratelimit } = require('@upstash/ratelimit');
const { Redis } = require('@upstash/redis');

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, '1 m'),
});

module.exports = async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  if (!success) return res.status(429).json({ error: 'Too many requests' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  // ... rest of the file unchanged below here
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
