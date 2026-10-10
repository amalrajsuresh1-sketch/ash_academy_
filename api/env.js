module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  res.status(200).json({
    API_URL: process.env.API_URL || process.env.DASHBOARD_API_URL || 'https://script.google.com/macros/s/AKfycby7qBr4g875SW3-_mIQB8yunRia3mQ4sgnwwQOLUkiGYYmDWpIHQwGxZoAwzPXkjr61sw/exec',
    AUTH_API_URL: process.env.AUTH_API_URL || 'https://script.google.com/macros/s/AKfycbyPH_WV-cwLaMKzuBkoR8nllH_qltje9iICMvjbuT_kw-3uD_Yn3DbD0oV-E7bZ5aEQPQ/exec'
  });
};
