/**
 * Ghost Jungle - GitHub data service
 *
 * Exact numbers, no estimates:
 *   - With GITHUB_TOKEN: one GraphQL query per 100 repositories returns every
 *     public, non-fork repository with its exact default-branch commit count,
 *     stars, forks, language + official language color.
 *   - Without a token: REST. Commit counts come from the `Link` header of
 *     /commits?per_page=1 (last page number = commit count). If the anonymous
 *     rate limit runs out mid-way, the remaining repos are flagged as estimated.
 *
 * Results are cached per user for 30 minutes. Missing users throw NOT_FOUND
 * instead of silently showing fake data.
 */

const https = require('https');

const CACHE_TTL = 30 * 60 * 1000;
const MAX_REPOS = 200;
const cache = new Map();
const inflight = new Map(); // concurrent requests for one user share a single GitHub fetch

class GitHubError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;     // NOT_FOUND | RATE_LIMITED | UPSTREAM
    this.status = status;
  }
}

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'GitHub-Ghost-Jungle/2.0',
      Accept: 'application/vnd.github+json',
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `bearer ${process.env.GITHUB_TOKEN}`;
    if (body) headers['Content-Type'] = 'application/json';

    const req = https.request(url, { method, headers, timeout: 15000 }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch (e) { /* non-JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, json });
      });
    });
    req.on('timeout', () => req.destroy(new Error('GitHub request timed out')));
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function rateLimited(res) {
  return (res.status === 403 || res.status === 429) && String(res.headers['x-ratelimit-remaining']) === '0';
}

/* ------------------------------------------------------------------ */
/* GraphQL (token)                                                     */
/* ------------------------------------------------------------------ */

const QUERY = `
query($login: String!, $after: String) {
  user(login: $login) {
    login name avatarUrl createdAt
    followers { totalCount }
    repositories(first: 100, after: $after, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC,
                 orderBy: { field: STARGAZERS, direction: DESC }) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        name description url pushedAt isArchived stargazerCount forkCount
        owner { login }
        primaryLanguage { name color }
        defaultBranchRef { target { ... on Commit { history { totalCount } } } }
      }
    }
  }
}`;

async function fetchGraphQL(login) {
  let after = null;
  let user = null;
  let repoCount = 0;
  const repos = [];
  do {
    const res = await request('POST', 'https://api.github.com/graphql', { query: QUERY, variables: { login, after } });
    if (rateLimited(res)) throw new GitHubError('RATE_LIMITED', 'GitHub rate limit reached', 429);
    if (res.status !== 200 || !res.json) throw new GitHubError('UPSTREAM', `GitHub GraphQL error ${res.status}`, 502);
    const errs = res.json.errors || [];
    if (errs.some(e => e.type === 'NOT_FOUND')) throw new GitHubError('NOT_FOUND', `No GitHub user named ${login}`, 404);
    if (errs.length || !res.json.data || !res.json.data.user) {
      if (!res.json.data || !res.json.data.user) throw new GitHubError('NOT_FOUND', `No GitHub user named ${login}`, 404);
      throw new GitHubError('UPSTREAM', errs[0].message, 502);
    }
    user = res.json.data.user;
    const page = user.repositories;
    repoCount = page.totalCount;
    for (const r of page.nodes) {
      repos.push({
        name: r.name,
        owner: r.owner.login,
        description: r.description || '',
        url: r.url,
        pushedAt: r.pushedAt,
        archived: r.isArchived,
        language: r.primaryLanguage ? r.primaryLanguage.name : 'Unknown',
        languageColor: r.primaryLanguage ? r.primaryLanguage.color : null,
        stars: r.stargazerCount,
        forks: r.forkCount,
        commits: r.defaultBranchRef && r.defaultBranchRef.target && r.defaultBranchRef.target.history
          ? r.defaultBranchRef.target.history.totalCount : 0,
        commitsExact: true,
      });
    }
    after = page.pageInfo.hasNextPage && repos.length < MAX_REPOS ? page.pageInfo.endCursor : null;
  } while (after);

  return {
    username: user.login,
    name: user.name || user.login,
    avatar: user.avatarUrl,
    createdAt: user.createdAt,
    followers: user.followers.totalCount,
    repoCount,
    repos,
    source: 'graphql',
  };
}

/* ------------------------------------------------------------------ */
/* REST (no token)                                                     */
/* ------------------------------------------------------------------ */

async function restCommitCount(owner, name) {
  const res = await request('GET', `https://api.github.com/repos/${owner}/${encodeURIComponent(name)}/commits?per_page=1`);
  if (rateLimited(res)) throw new GitHubError('RATE_LIMITED', 'rate limited', 429);
  if (res.status === 409) return 0; // empty repository
  if (res.status !== 200) throw new GitHubError('UPSTREAM', `commits ${res.status}`, 502);
  const link = res.headers.link || '';
  const m = link.match(/[?&]page=(\d+)>; rel="last"/);
  if (m) return parseInt(m[1], 10);
  return Array.isArray(res.json) ? res.json.length : 0;
}

async function fetchREST(login) {
  const u = await request('GET', `https://api.github.com/users/${encodeURIComponent(login)}`);
  if (u.status === 404) throw new GitHubError('NOT_FOUND', `No GitHub user named ${login}`, 404);
  if (rateLimited(u)) throw new GitHubError('RATE_LIMITED', 'GitHub rate limit reached', 429);
  if (u.status !== 200) throw new GitHubError('UPSTREAM', `GitHub error ${u.status}`, 502);

  const raw = [];
  for (let page = 1; page <= 2; page++) {
    const r = await request('GET', `https://api.github.com/users/${encodeURIComponent(login)}/repos?per_page=100&type=owner&sort=pushed&page=${page}`);
    if (rateLimited(r)) throw new GitHubError('RATE_LIMITED', 'GitHub rate limit reached', 429);
    if (r.status !== 200 || !Array.isArray(r.json)) break;
    raw.push(...r.json);
    if (r.json.length < 100) break;
  }

  const owned = raw.filter(r => !r.fork && !r.private);
  owned.sort((a, b) => b.stargazers_count - a.stargazers_count);
  const repos = owned.slice(0, MAX_REPOS).map(r => ({
    name: r.name,
    owner: r.owner.login,
    description: r.description || '',
    url: r.html_url,
    pushedAt: r.pushed_at,
    archived: r.archived,
    language: r.language || 'Unknown',
    languageColor: null,
    stars: r.stargazers_count,
    forks: r.forks_count,
    size: r.size,
    commits: 0,
    commitsExact: false,
  }));

  // Exact commit counts, 6 at a time, until the anonymous limit runs out
  let limited = false;
  for (let i = 0; i < repos.length; i += 6) {
    await Promise.all(repos.slice(i, i + 6).map(async repo => {
      if (limited) return;
      try {
        repo.commits = await restCommitCount(repo.owner, repo.name);
        repo.commitsExact = true;
      } catch (e) {
        if (e.code === 'RATE_LIMITED') limited = true;
      }
    }));
    if (limited) break;
  }
  for (const repo of repos) {
    if (!repo.commitsExact) repo.commits = Math.max(1, Math.round(Math.sqrt(repo.size || 10) * 2.8));
    delete repo.size;
  }

  return {
    username: u.json.login,
    name: u.json.name || u.json.login,
    avatar: u.json.avatar_url,
    createdAt: u.json.created_at,
    followers: u.json.followers,
    repoCount: raw.length >= 200 ? Math.max(owned.length, u.json.public_repos) : owned.length,
    repos,
    source: 'rest',
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

function sortRepos(repos, sort) {
  const list = repos.slice();
  if (sort === 'stars') list.sort((a, b) => b.stars - a.stars || b.commits - a.commits);
  else if (sort === 'updated') list.sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt));
  else list.sort((a, b) => b.commits - a.commits || b.stars - a.stars);
  return list;
}

/**
 * @param {string} username
 * @param {{ sort?: 'commits'|'stars'|'updated' }} options
 */
async function getGhostJungleData(username, options = {}) {
  const key = username.toLowerCase();
  let base = cache.get(key);
  if (!base || Date.now() - base.timestamp > CACHE_TTL) {
    if (!inflight.has(key)) {
      const p = (process.env.GITHUB_TOKEN ? fetchGraphQL(username) : fetchREST(username))
        .finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    const data = await inflight.get(key);
    base = { timestamp: Date.now(), data };
    cache.set(key, base);
  }
  const d = base.data;
  const repos = sortRepos(d.repos, options.sort);
  return {
    ...d,
    repos,
    totalCommits: repos.reduce((s, r) => s + r.commits, 0),
    totalStars: repos.reduce((s, r) => s + r.stars, 0),
    totalForks: repos.reduce((s, r) => s + r.forks, 0),
    totalRepos: Math.max(d.repoCount || 0, repos.length),
    sampledRepos: repos.length,
    commitsExact: repos.every(r => r.commitsExact),
    fetchedAt: new Date(base.timestamp).toISOString(),
  };
}

/** Deterministic sample data for tests and offline previews (never used as a silent fallback) */
function generateMockUserData(username) {
  const seed = (username || 'wanderer').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const repos = [
    ['core', 'TypeScript', 620 + (seed % 180), 42 + (seed % 15), 'The ancient foundational nexus engine powering the ecosystem.'],
    ['spectral-runtime', 'Rust', 340 + (seed % 90), 88 + (seed % 30), 'High performance parallel spectral graph executor.'],
    ['phantom-ui', 'JavaScript', 215 + (seed % 60), 29, 'Interactive bioluminescent component kit and particle shaders.'],
    ['canopy-ai', 'Python', 110 + (seed % 50), 64, 'Neural forest ambient acoustic intelligence models.'],
    ['mist-protocol', 'Go', 78 + (seed % 30), 18, 'Lightweight distributed telemetry routing over peer wisps.'],
    ['banyan-db', 'C++', 46 + (seed % 20), 12, 'Embedded key-value store with root-level snapshotting.'],
    ['spooky-utils', 'Shell', 18 + (seed % 10), 5, 'Handy scripts for tending the haunted forest.'],
    ['whispering-docs', 'HTML', 6 + (seed % 5), 3, 'Living codex and incantations.'],
  ].map(([name, language, commits, stars, description], i) => ({
    name: i === 0 ? `${username}-core` : name,
    owner: username,
    language,
    languageColor: null,
    commits,
    commitsExact: true,
    stars,
    forks: Math.round(stars / 4),
    description,
    url: `https://github.com/${username}/${i === 0 ? `${username}-core` : name}`,
    pushedAt: new Date(Date.UTC(2026, 10, 1) - i * 86400000 * 9).toISOString(),
  }));
  return {
    username,
    name: username,
    followers: 40 + (seed % 200),
    createdAt: '2016-04-01T00:00:00Z',
    repos,
    totalCommits: repos.reduce((a, r) => a + r.commits, 0),
    totalStars: repos.reduce((a, r) => a + r.stars, 0),
    totalForks: repos.reduce((a, r) => a + r.forks, 0),
    totalRepos: repos.length,
    commitsExact: true,
    isMock: true,
  };
}

module.exports = { getGhostJungleData, generateMockUserData, GitHubError };
