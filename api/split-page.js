module.exports = async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'];
    const origin = `${protocol}://${host}`;

    const response = await fetch(`${origin}/index.html`);
    if (!response.ok) throw new Error('Failed to fetch index.html');
    let html = await response.text();

    const splitId = req.query.id || '';
    const splitUrl = `${origin}/split/${splitId}`;

    // Replace <title>
   html = html.replace(
  /<title>.*?<\/title>/i,
  '<title>Join my Group Split on Comrade!</title>'
);

    // Replace og:title
   html = html.replace(
  /<meta property="og:title" content=".*?">/i,
  '<meta property="og:title" content="Join my Group Split on Comrade!">'
);

    html = html.replace(
  /<meta name="twitter:title" content=".*?">/i,
  '<meta name="twitter:title" content="Join my Group Split on Comrade!">'
);
    
    // Replace og:description
    html = html.replace(
      "og:description\" content=\"Wealth isn't evenly distributed. Costs shouldn't be either.\"",
      'og:description" content="The fairer way to split bills with friends."'
    );

    // Replace og:url
    html = html.replace(
      'og:url" content="https://comrade.money"',
      'og:url" content="' + splitUrl + '"'
    );

    // Replace meta description
  html = html.replace(
  /<meta\s+name=["']description["'][^>]*>/i,
  '<meta name="description" content="The fairer way to split bills with friends." />'
);

    if (!html.match(/twitter:title/i)) {
  html = html.replace(
    '</head>',
    '<meta name="twitter:title" content="Join my Group Split on Comrade!" />\n</head>'
  );
}
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('split-page error:', err);
    res.writeHead(302, { Location: '/' });
    return res.end();
  }
};
