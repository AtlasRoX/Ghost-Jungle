/**
 * Ghost Jungle - Main Server & API Service
 */

const express = require('express');
const path = require('path');
const { getGhostJungleData } = require('./src/github');
const { renderJungleSvg } = require('./src/renderer');
const { THEMES } = require('./src/themes');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static interactive playground
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Dynamic SVG Endpoint for GitHub README embed
 * Usage in Markdown:
 * [![Ghost Jungle](https://your-domain.com/api/ghost-jungle?username=octocat)](https://your-domain.com/?username=octocat)
 */
app.get('/api/ghost-jungle', async (req, res) => {
  try {
    const username = req.query.username || 'octocat';
    const theme = req.query.theme || 'midnight';
    const limit = req.query.limit || 8;
    const sort = req.query.sort || 'commits';
    const width = req.query.width || 880;
    const height = req.query.height || 500;

    const userData = await getGhostJungleData(username, { limit, sort });
    const svg = renderJungleSvg(userData, { theme, limit, width, height });

    // Set cache headers optimized for GitHub Camo Proxy
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.send(svg);
  } catch (err) {
    console.error('Error generating Ghost Jungle SVG:', err);
    res.status(500).send('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><text x="20" y="50" fill="red">Error summoning Ghost Jungle</text></svg>');
  }
});

/**
 * JSON Endpoint for Interactive Web Companion
 */
app.get('/api/user-data', async (req, res) => {
  try {
    const username = req.query.username || 'octocat';
    const limit = req.query.limit || 8;
    const sort = req.query.sort || 'commits';

    const userData = await getGhostJungleData(username, { limit, sort });
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * List themes endpoint
 */
app.get('/api/themes', (req, res) => {
  res.json(Object.keys(THEMES).map(key => ({
    id: key,
    name: THEMES[key].name,
    moonColor: THEMES[key].moonColor,
    floraGlow: THEMES[key].floraGlow
  })));
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🌿 Ghost Jungle Server haunting at http://localhost:${PORT}`);
    console.log(`👻 SVG API: http://localhost:${PORT}/api/ghost-jungle?username=octocat`);
  });
}

module.exports = app;
