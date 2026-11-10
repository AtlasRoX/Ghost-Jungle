/** Vercel Serverless Function: GET /api/portrait?tier=1..5 */
const { portrait, adapt } = require('../src/handlers');
module.exports = adapt(portrait);
