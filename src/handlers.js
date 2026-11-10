/**
 * Ghost Jungle - Framework-agnostic request handlers.
 * Shared by the Express server (server.js) and Vercel functions (api/*.js).
 */

const { getGhostJungleData } = require('./github');
const { renderJungleSvg, renderGhostPortrait, SVG_MAX_SPIRITS, INTERACTIVE_MAX_SPIRITS } = require('./renderer');
const { THEMES, LANGUAGE_COLORS } = require('./themes');
const { TIERS } = require('./ghost-sprites');
const { RANKS, METRICS, computeRank } = require('./rank');

const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const SVG_CACHE = 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400';
const SORTS = new Set(['commits', 'stars', 'updated']);

function cleanUsername(raw) {
  const u = String(raw || 'octocat').trim().replace(/^@/, '');
  return USERNAME_RE.test(u) ? u : null;
}

const cleanSort = s => (SORTS.has(s) ? s : 'commits');
const cleanLimit = l => (l === undefined || l === '' || l === 'all' ? 'all' : Math.max(1, parseInt(l, 10) || 1));

function errorSvg(title, detail) {
  const f = `font-family="-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 400" width="880" height="400" role="img" aria-label="${title}">
  <defs><radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#13233a" /><stop offset="100%" stop-color="#05070d" /></radialGradient></defs>
  <rect width="880" height="400" rx="18" fill="url(#g)" stroke="#ffffff" stroke-opacity="0.12" />
  <path d="M 440 150 C 462 150 466 170 464 190 C 462 202 456 206 452 200 C 448 194 442 206 438 200 C 434 194 428 206 424 200 C 420 194 416 202 416 188 C 414 170 418 150 440 150 Z" fill="#e2e8f0" opacity="0.85" />
  <ellipse cx="432" cy="172" rx="2.4" ry="3.4" fill="#05070d" /><ellipse cx="448" cy="172" rx="2.4" ry="3.4" fill="#05070d" />
  <text x="440" y="246" text-anchor="middle" ${f} font-size="9" font-weight="700" letter-spacing="3" fill="#7dd3fc">THE GHOST JUNGLE</text>
  <text x="440" y="272" text-anchor="middle" ${f} font-size="17" fill="#e2e8f0">${title}</text>
  <text x="440" y="294" text-anchor="middle" ${f} font-size="11" fill="#8a96a8">${detail}</text>
</svg>`;
}

function describeError(err, username) {
  if (err && err.code === 'NOT_FOUND') return { status: 404, title: `No GitHub user named “${username}”`, detail: 'Check the spelling of the username parameter.' };
  if (err && err.code === 'RATE_LIMITED') return { status: 503, title: 'The spirits need rest', detail: 'GitHub rate limit reached. Set GITHUB_TOKEN on the server.' };
  return { status: 502, title: 'The spirits are restless', detail: 'GitHub could not be reached. Try again shortly.' };
}

async function jungleSvg(q) {
  const username = cleanUsername(q.username);
  const svgType = 'image/svg+xml; charset=utf-8';
  if (!username) return { status: 400, type: svgType, cache: 'no-store', body: errorSvg('That is not a valid GitHub username', 'Usernames use letters, numbers and single hyphens.') };
  try {
    const data = await getGhostJungleData(username, { sort: cleanSort(q.sort) });
    const limit = cleanLimit(q.limit);
    const body = renderJungleSvg(data, {
      theme: q.theme,
      limit: limit === 'all' ? undefined : limit,
      width: q.width,
      height: q.height,
      mode: q.mode === 'interactive' ? 'interactive' : 'readme',
    });
    return { status: 200, type: svgType, cache: SVG_CACHE, body };
  } catch (err) {
    const e = describeError(err, username);
    if (e.status >= 500) console.error('Ghost Jungle render failed:', err.message);
    return { status: e.status, type: svgType, cache: 'no-store', body: errorSvg(e.title, e.detail) };
  }
}

async function userData(q) {
  const username = cleanUsername(q.username);
  const json = (status, obj, cache = 'no-store') => ({ status, type: 'application/json', cache, body: JSON.stringify(obj) });
  if (!username) return json(400, { error: 'Invalid username' });
  try {
    const data = await getGhostJungleData(username, { sort: cleanSort(q.sort) });
    const rank = computeRank({ commits: data.totalCommits, stars: data.totalStars, followers: data.followers, repos: data.totalRepos });
    const { parts, ...rankSummary } = rank;
    return json(200, { ...data, rank: { ...rankSummary, parts: parts.map(({ key, label, value, median, weight, cdf }) => ({ key, label, value, median, weight, cdf })) } }, 'public, max-age=600');
  } catch (err) {
    const e = describeError(err, username);
    return json(e.status, { error: e.title, detail: e.detail, code: err.code || 'UPSTREAM' });
  }
}

function meta() {
  const themes = Object.entries(THEMES).map(([id, t]) => ({ id, name: t.name, moonColor: t.moonColor, floraGlow: t.floraGlow, bg: t.bgGradient[1] }));
  const tiers = TIERS.map(({ tier, min, title, short, numeral, color }) => ({ tier, min, title, short, numeral, color }));
  return {
    status: 200, type: 'application/json', cache: 'public, max-age=3600',
    body: JSON.stringify({
      themes, tiers, ranks: RANKS, metrics: METRICS, languages: LANGUAGE_COLORS,
      limits: { svg: SVG_MAX_SPIRITS, interactive: INTERACTIVE_MAX_SPIRITS },
    }),
  };
}

function portrait(q) {
  return { status: 200, type: 'image/svg+xml; charset=utf-8', cache: 'public, max-age=86400', body: renderGhostPortrait(q.tier, { theme: q.theme, language: q.language }) };
}

/** Adapt a handler to (req, res) for both Express and Vercel */
function adapt(handler) {
  return async (req, res) => {
    const out = await handler(req.query || {});
    res.statusCode = out.status;
    res.setHeader('Content-Type', out.type);
    res.setHeader('Cache-Control', out.cache);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (out.type.startsWith('image/svg')) res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; font-src data:");
    res.end(out.body);
  };
}

module.exports = { jungleSvg, userData, meta, portrait, adapt, cleanUsername };
