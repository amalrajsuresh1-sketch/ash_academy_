// Vercel Serverless Function: Secure Proxy for Dashboard Data
// Hides Google Apps Script API URL from the public client browser and DevTools network tab

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = process.env.API_URL || process.env.DASHBOARD_API_URL || 'https://script.google.com/macros/s/AKfycby7qBr4g875SW3-_mIQB8yunRia3mQ4sgnwwQOLUkiGYYmDWpIHQwGxZoAwzPXkjr61sw/exec';

  try {
    const fetchRes = await fetch(targetUrl, {
      redirect: 'follow',
      headers: { 'Accept': 'application/json' }
    });

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({
        status: 'error',
        message: `Upstream service returned HTTP ${fetchRes.status}`
      });
    }

    const data = await fetchRes.json();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Data proxy error:', error);
    return res.status(502).json({
      status: 'error',
      message: 'Failed to fetch data from upstream service',
      error: error.message
    });
  }
};
