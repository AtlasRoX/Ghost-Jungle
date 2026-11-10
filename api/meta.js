/** Vercel Serverless Function: GET /api/meta */
const { meta, adapt } = require('../src/handlers');
module.exports = adapt(meta);
