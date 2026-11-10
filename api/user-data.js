/** Vercel Serverless Function: GET /api/user-data */
const { userData, adapt } = require('../src/handlers');
module.exports = adapt(userData);
