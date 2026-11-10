/**
 * Ghost Jungle - Local server: interactive playground + SVG API
 */

const express = require('express');
const path = require('path');
const { jungleSvg, userData, meta, portrait, adapt } = require('./src/handlers');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/ghost-jungle', adapt(jungleSvg)); // README embed
app.get('/api/user-data', adapt(userData));     // playground data
app.get('/api/meta', adapt(meta));              // themes, tiers, language colors
app.get('/api/portrait', adapt(portrait));      // single ghost portrait

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Ghost Jungle running at http://localhost:${PORT}`);
    console.log(`SVG API: http://localhost:${PORT}/api/ghost-jungle?username=octocat`);
  });
}

module.exports = app;
