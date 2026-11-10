/** Vercel Serverless Function: GET /api/ghost-jungle */
const { jungleSvg, adapt } = require('../src/handlers');
module.exports = adapt(jungleSvg);
