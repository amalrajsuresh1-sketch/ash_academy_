// Vercel Serverless Function: Secure Proxy for Dashboard Data
// Hides Google Apps Script API URL from the public client browser and DevTools network tab

const fs = require('fs');
const path = require('path');

function loadLocalEnvFallback() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const text = fs.readFileSync(envPath, 'utf-8');
      text.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  } catch (e) {}
}

module.exports = async (req, res) => {
  loadLocalEnvFallback();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = process.env.API_URL || process.env.DASHBOARD_API_URL;
  if (!targetUrl) {
    return res.status(500).json({
      status: 'error',
      message: 'API_URL environment variable is not configured on the server.'
    });
  }

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
