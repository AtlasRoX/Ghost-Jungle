/**
 * Vercel Serverless Function Handler
 * Route: /api/ghost-jungle
 */

const { getGhostJungleData } = require('../src/github');
const { renderJungleSvg } = require('../src/renderer');

module.exports = async (req, res) => {
  try {
    const {
      username = 'octocat',
      theme = 'midnight',
      limit = 8,
      sort = 'commits',
      width = 880,
      height = 500
    } = req.query;

    const userData = await getGhostJungleData(username, { limit, sort });
    const svg = renderJungleSvg(userData, { theme, limit, width, height });

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).send(svg);
  } catch (err) {
    console.error('Serverless error:', err);
    res.status(500).send('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><text x="20" y="50" fill="red">Error summoning Ghost Jungle</text></svg>');
  }
};
