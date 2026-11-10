/**
 * Ghost Jungle - GitHub API Data Service & Cache
 */

const https = require('https');

// Simple in-memory cache (TTL: 30 minutes)
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

/**
 * Perform HTTPS GET request with User-Agent and optional Token
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'GitHub-Ghost-Jungle-Widget/1.0',
      'Accept': 'application/vnd.github.v3+json'
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse JSON response'));
          }
        } else {
          const err = new Error(`GitHub API responded with status ${res.statusCode}: ${data}`);
          err.statusCode = res.statusCode;
          reject(err);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Generate high-fidelity fallback spectral data if rate-limited or offline
 */
function generateMockUserData(username) {
  const seed = (username || 'wanderer').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const mockRepos = [
    {
      name: `${username}-core`,
      owner: username,
      language: 'TypeScript',
      commits: 620 + (seed % 180),
      stars: 42 + (seed % 15),
      forks: 12,
      description: 'The ancient foundational nexus engine powering the ecosystem.'
    },
    {
      name: 'spectral-runtime',
      owner: username,
      language: 'Rust',
      commits: 340 + (seed % 90),
      stars: 88 + (seed % 30),
      forks: 16,
      description: 'High performance parallel spectral graph executor.'
    },
    {
      name: 'phantom-ui',
      owner: username,
      language: 'JavaScript',
      commits: 215 + (seed % 60),
      stars: 29,
      forks: 7,
      description: 'Interactive bioluminescent component kit and particle shaders.'
    },
    {
      name: 'canopy-ai',
      owner: username,
      language: 'Python',
      commits: 110 + (seed % 50),
      stars: 64,
      forks: 19,
      description: 'Neural forest ambient acoustic intelligence models.'
    },
    {
      name: 'mist-protocol',
      owner: username,
      language: 'Go',
      commits: 78 + (seed % 30),
      stars: 18,
      forks: 4,
      description: 'Lightweight distributed telemetry routing over peer wisps.'
    },
    {
      name: 'banyan-db',
      owner: username,
      language: 'C++',
      commits: 46 + (seed % 20),
      stars: 12,
      forks: 2,
      description: 'Embedded key-value store with root-level snapshotting.'
    },
    {
      name: 'spooky-utils',
      owner: username,
      language: 'Shell',
      commits: 18 + (seed % 10),
      stars: 5,
      forks: 1,
      description: 'Handy scripts for tending the haunted forest.'
    },
    {
      name: 'whispering-docs',
      owner: username,
      language: 'HTML',
      commits: 6 + (seed % 5),
      stars: 3,
      forks: 0,
      description: 'Living codex and incantations.'
    }
  ];

  return {
    username,
    repos: mockRepos,
    totalCommits: mockRepos.reduce((acc, r) => acc + r.commits, 0),
    totalStars: mockRepos.reduce((acc, r) => acc + r.stars, 0),
    isMock: true
  };
}

/**
 * Fetch and process real GitHub user repositories
 */
async function getGhostJungleData(username, options = {}) {
  const cacheKey = `jungle_${username.toLowerCase()}_${options.sort || 'commits'}_${options.limit || 8}`;
  const cached = cache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  try {
    // 1. Fetch user profile
    const user = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}`);

    // 2. Fetch user repositories (up to 100 recent)
    const rawRepos = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`);

    if (!Array.isArray(rawRepos) || rawRepos.length === 0) {
      return generateMockUserData(username);
    }

    // Filter out forks if preferred, or include them with note
    const nonForks = rawRepos.filter(r => !r.fork);
    const reposToProcess = nonForks.length >= 3 ? nonForks : rawRepos;

    // Estimate/map commits for each repo
    // Repos size (KB) roughly correlates with commit history and code weight
    const processedRepos = reposToProcess.map((r) => {
      // Approximate commits from size, age, and activity
      // Formula: base commits calculated from size and push frequency
      let estimatedCommits = Math.max(1, Math.round(Math.sqrt(r.size || 10) * 2.8));
      if (r.stargazers_count > 50) estimatedCommits += 40;
      if (r.open_issues_count > 5) estimatedCommits += 20;

      // Realistic clamping
      estimatedCommits = Math.min(Math.max(estimatedCommits, 1), 3500);

      return {
        name: r.name,
        owner: r.owner?.login || username,
        language: r.language || 'Unknown',
        commits: estimatedCommits,
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        description: r.description || 'A mysterious repository spirit wandering the jungle.',
        url: r.html_url,
        pushedAt: r.pushed_at
      };
    });

    // Sort according to user preference
    const sort = options.sort || 'commits';
    if (sort === 'stars') {
      processedRepos.sort((a, b) => b.stars - a.stars);
    } else if (sort === 'updated') {
      processedRepos.sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt));
    } else {
      // default: commits (ghost power)
      processedRepos.sort((a, b) => b.commits - a.commits);
    }

    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 8, 1), 10);
    const finalRepos = processedRepos.slice(0, limit);

    const totalCommits = processedRepos.reduce((sum, r) => sum + r.commits, 0);
    const totalStars = processedRepos.reduce((sum, r) => sum + r.stars, 0);

    const result = {
      username: user.login || username,
      avatar: user.avatar_url,
      repos: finalRepos,
      totalCommits,
      totalStars,
      isMock: false
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    // If rate-limited (HTTP 403) or user not found, fall back cleanly to high-fidelity mock
    console.warn(`[GitHub API] Fetch failed for "${username}" (${err.message}). Using enchanted fallback data.`);
    const fallback = generateMockUserData(username);
    cache.set(cacheKey, { timestamp: Date.now(), data: fallback });
    return fallback;
  }
}

module.exports = {
  getGhostJungleData,
  generateMockUserData
};
