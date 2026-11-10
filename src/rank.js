/**
 * Ghost Jungle - Canopy Rank
 *
 * A percentile estimate of how a profile compares with other GitHub users.
 * Each metric is mapped to 0..1 with a cumulative distribution centered on a
 * typical (median) value, then the metrics are blended by weight.
 *
 *   commits    exponential CDF   median 250   weight 2
 *   stars      log-normal CDF    median 50    weight 4
 *   followers  log-normal CDF    median 10    weight 1
 *   repos      exponential CDF   median 12    weight 1
 *
 *   exponential(x) = 1 - 2^(-x)       (x = value / median)
 *   log-normal(x)  = x / (1 + x)
 *
 * score = Σ weight·cdf / Σ weight;  top % = (1 - score) × 100
 * At exactly the median on every metric a profile lands at the top 50%.
 */

const METRICS = [
  { key: 'commits', label: 'Commits', median: 250, weight: 2, cdf: 'exponential' },
  { key: 'stars', label: 'Stars', median: 50, weight: 4, cdf: 'lognormal' },
  { key: 'followers', label: 'Followers', median: 10, weight: 1, cdf: 'lognormal' },
  { key: 'repos', label: 'Repositories', median: 12, weight: 1, cdf: 'exponential' },
];

const RANKS = [
  { grade: 'SS', title: 'Mythic Sovereign', top: 1,    color: '#fcd34d', lore: 'Legends whisper of a canopy so ancient the moon bends toward it.' },
  { grade: 'S',  title: 'Ancient Elder',    top: 5,    color: '#f9a8d4', lore: 'Its spirits have watched whole forests rise and fall.' },
  { grade: 'A+', title: 'Wraith Lord',      top: 12.5, color: '#c4b5fd', lore: 'Lantern-bearers answer to this jungle.' },
  { grade: 'A',  title: 'Haunted Keeper',   top: 25,   color: '#a5b4fc', lore: 'A well-tended grove, alive after dark.' },
  { grade: 'B+', title: 'Awakened Seer',    top: 37.5, color: '#7dd3fc', lore: 'The spirits have begun to notice you.' },
  { grade: 'B',  title: 'Wandering Soul',   top: 50,   color: '#6ee7b7', lore: 'A clearing finds its first steady light.' },
  { grade: 'C',  title: 'Whispering Sprout', top: 100, color: '#cbd5e1', lore: 'Every jungle starts as a single seed.' },
];

const exponential = x => 1 - Math.pow(2, -x);
const lognormal = x => x / (1 + x);

/**
 * @param {{commits:number, stars:number, followers:number, repos:number}} s
 */
function computeRank(s) {
  const totalWeight = METRICS.reduce((a, m) => a + m.weight, 0);
  const parts = METRICS.map(m => {
    const v = Math.max(0, Number(s[m.key]) || 0);
    const p = (m.cdf === 'exponential' ? exponential : lognormal)(v / m.median);
    return { ...m, value: v, cdf: p, contribution: (p * m.weight) / totalWeight };
  });
  const score = parts.reduce((a, p) => a + p.contribution, 0);
  const top = Math.max(0.1, (1 - score) * 100);
  const rank = RANKS.find(r => top <= r.top) || RANKS[RANKS.length - 1];
  const index = RANKS.indexOf(rank);
  const next = index > 0 ? RANKS[index - 1] : null;
  return {
    ...rank,
    topPercent: top,
    topLabel: top < 1 ? `TOP ${top.toFixed(1)}%` : `TOP ${Math.round(top)}%`,
    score,
    next,
    parts,
  };
}

module.exports = { computeRank, RANKS, METRICS };
