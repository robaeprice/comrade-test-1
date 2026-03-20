module.exports = async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'];
    const origin = `${protocol}://${host}`;
    const splitId = req.query.id || '';

    // Fetch group name from Redis
    let ogTitle = 'Join my Group Split on Comrade!';
    try {
      const splitRes = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['GET', splitId])
      });
      const splitData = await splitRes.json();
      if (splitData.result) {
        const parsed = JSON.parse(splitData.result);
        if (parsed.groupName) {
          const safe = parsed.groupName.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
          ogTitle = `Join ${safe} on Comrade!`;
        }
      }
    } catch (e) {
      // Fall back to generic title
    }

    const response = await fetch(`${origin}/index.html`);
    if (!response.ok) throw new Error('Failed to fetch index.html');
    let html = await response.text();

    const splitUrl = `${origin}/split/${splitId}`;

    // Replace <title>
    html = html.replace(
      /<title>.*?<\/title>/i,
      `<title>${ogTitle}</title>`
    );

    // Replace og:title
    html = html.replace(
      /<meta\s+property=["']og:title["'][^>]*>/i,
      `<meta property="og:title" content="${ogTitle}" />`
    );

    // Replace or insert twitter:title
    if (html.match(/twitter:title/i)) {
      html = html.replace(
        /<meta name="twitter:title" content=".*?">/i,
        `<meta name="twitter:title" content="${ogTitle}">`
      );
    } else {
      html = html.replace(
        '</head>',
        `<meta name="twitter:title" content="${ogTitle}" />\n</head>`
      );
    }

    // Replace og:description
    html = html.replace(
      "og:description\" content=\"Wealth isn't evenly distributed. Costs shouldn't be either.\"",
      'og:description" content="The fairer way to split bills with friends."'
    );

    // Replace og:url
    html = html.replace(
      /<meta\s+property=["']og:url["'][^>]*>/i,
      `<meta property="og:url" content="${splitUrl}" />`
    );

    // Replace meta description
    html = html.replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      '<meta name="description" content="The fairer way to split bills with friends." />'
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('split-page error:', err);
    res.writeHead(302, { Location: '/' });
    return res.end();
  }
};
