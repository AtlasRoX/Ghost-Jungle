/**
 * Ghost Jungle - Ghost Sprites & Evolution Tier Generators
 * 
 * Generates modular SVG vector paths and animations for each evolution tier.
 */

const { getLanguageColor } = require('./themes');

/**
 * Determine ghost tier based on commit count
 */
function getGhostTier(commits) {
  if (commits >= 500) {
    return {
      tier: 5,
      title: 'Ancient Titan',
      badge: '🌌 Titan',
      scale: 1.25,
      glowRadius: 18,
      floatDuration: '3.2s',
      tailWaves: 4
    };
  }
  if (commits >= 200) {
    return {
      tier: 4,
      title: 'Wraith Archon',
      badge: '👑 Wraith',
      scale: 1.15,
      glowRadius: 14,
      floatDuration: '3.6s',
      tailWaves: 3
    };
  }
  if (commits >= 50) {
    return {
      tier: 3,
      title: 'Phantom Stalker',
      badge: '🔮 Phantom',
      scale: 1.05,
      glowRadius: 11,
      floatDuration: '4.0s',
      tailWaves: 2
    };
  }
  if (commits >= 10) {
    return {
      tier: 2,
      title: 'Forest Specter',
      badge: '🌿 Specter',
      scale: 0.95,
      glowRadius: 9,
      floatDuration: '4.4s',
      tailWaves: 2
    };
  }
  return {
    tier: 1,
    title: 'Lesser Wisp',
    badge: '🌱 Wisp',
    scale: 0.85,
    glowRadius: 7,
    floatDuration: '4.8s',
    tailWaves: 1
  };
}

/**
 * Render Tier 1: Lesser Wisp (< 10 commits)
 */
function renderTier1(langColor, id) {
  return `
    <!-- Tier 1: Lesser Wisp -->
    <!-- Ghost Body -->
    <path class="ghost-body" d="M 0 -22 C 16 -22, 22 -6, 20 12 C 18 22, 10 26, 4 20 C 0 16, -6 24, -14 20 C -20 16, -20 -4, -18 -12 C -16 -20, -10 -22, 0 -22 Z"
          fill="url(#ghost-grad-${id})" filter="url(#glow-${id})" />
    
    <!-- Inner Soul Core -->
    <circle cx="0" cy="2" r="6" fill="${langColor}" opacity="0.85" filter="url(#core-glow)" />
    <circle cx="0" cy="2" r="3" fill="#ffffff" opacity="0.9" />

    <!-- Cute Eyes -->
    <ellipse cx="-7" cy="-6" rx="2.5" ry="3.5" fill="#0f172a" />
    <ellipse cx="7" cy="-6" rx="2.5" ry="3.5" fill="#0f172a" />
    <circle cx="-6" cy="-7.5" r="1.2" fill="#ffffff" />
    <circle cx="8" cy="-7.5" r="1.2" fill="#ffffff" />
    <!-- Blushing cheeks -->
    <ellipse cx="-11" cy="-1" rx="2" ry="1.2" fill="${langColor}" opacity="0.6" />
    <ellipse cx="11" cy="-1" rx="2" ry="1.2" fill="${langColor}" opacity="0.6" />
  `;
}

/**
 * Render Tier 2: Forest Specter (10 - 49 commits)
 */
function renderTier2(langColor, id) {
  return `
    <!-- Tier 2: Forest Specter -->
    <!-- Ghost Body with undulating tail flaps -->
    <path class="ghost-body" d="M 0 -28 C 22 -28, 26 -8, 24 12 C 22 24, 16 28, 12 22 C 8 16, 2 28, -2 22 C -6 16, -12 28, -16 22 C -20 16, -24 24, -24 10 C -26 -8, -22 -28, 0 -28 Z"
          fill="url(#ghost-grad-${id})" filter="url(#glow-${id})" />

    <!-- Spectral Hands -->
    <path d="M -22 2 C -30 2, -32 -4, -30 -8 C -26 -5, -24 -2, -22 0" fill="url(#ghost-grad-${id})" opacity="0.8" />
    <path d="M 22 2 C 30 2, 32 -4, 30 -8 C 26 -5, 24 -2, 22 0" fill="url(#ghost-grad-${id})" opacity="0.8" />

    <!-- Inner Soul Core Flame -->
    <path d="M 0 -8 C 6 -2, 7 8, 0 12 C -7 8, -6 -2, 0 -8 Z" fill="${langColor}" opacity="0.9" filter="url(#core-glow)" />
    <circle cx="0" cy="5" r="3.5" fill="#ffffff" opacity="0.95" />

    <!-- Expressive Eyes -->
    <path d="M -11 -8 Q -7 -12 -5 -6 Q -8 -4 -11 -8 Z" fill="#0b1329" />
    <path d="M 11 -8 Q 7 -12 5 -6 Q 8 -4 11 -8 Z" fill="#0b1329" />
    <circle cx="-7.5" cy="-7.5" r="1.3" fill="${langColor}" />
    <circle cx="7.5" cy="-7.5" r="1.3" fill="${langColor}" />
  `;
}

/**
 * Render Tier 3: Phantom Stalker (50 - 199 commits)
 */
function renderTier3(langColor, id) {
  return `
    <!-- Tier 3: Phantom Stalker -->
    <!-- Horns / Ear wisps -->
    <path d="M -16 -24 Q -26 -42 -32 -36 Q -24 -28 -14 -18 Z" fill="${langColor}" opacity="0.85" filter="url(#core-glow)" />
    <path d="M 16 -24 Q 26 -42 32 -36 Q 24 -28 14 -18 Z" fill="${langColor}" opacity="0.85" filter="url(#core-glow)" />

    <!-- Ghost Body -->
    <path class="ghost-body" d="M 0 -34 C 26 -34, 30 -10, 28 14 C 26 30, 18 36, 12 24 C 6 14, 0 38, -6 24 C -12 12, -18 34, -22 24 C -28 12, -30 -10, 0 -34 Z"
          fill="url(#ghost-grad-${id})" filter="url(#glow-${id})" />

    <!-- Flowing Spectral Wisps near shoulders -->
    <circle cx="-30" cy="4" r="3" fill="${langColor}" opacity="0.75" filter="url(#core-glow)" />
    <circle cx="30" cy="4" r="3" fill="${langColor}" opacity="0.75" filter="url(#core-glow)" />

    <!-- Soul Heart Crystal -->
    <polygon points="0,-12 8,2 0,16 -8,2" fill="${langColor}" opacity="0.95" filter="url(#core-glow)" />
    <polygon points="0,-8 5,2 0,11 -5,2" fill="#ffffff" opacity="0.9" />

    <!-- Piercing Eyes -->
    <polygon points="-12,-11 -4,-8 -7,-4 -14,-7" fill="#040814" />
    <polygon points="12,-11 4,-8 7,-4 14,-7" fill="#040814" />
    <circle cx="-8" cy="-7.5" r="1.6" fill="#ffffff" />
    <circle cx="8" cy="-7.5" r="1.6" fill="#ffffff" />

    <!-- Forehead Rune -->
    <polygon points="0,-25 2.5,-20 0,-15 -2.5,-20" fill="${langColor}" opacity="0.9" />
  `;
}

/**
 * Render Tier 4: Wraith Archon (200 - 499 commits)
 */
function renderTier4(langColor, id) {
  return `
    <!-- Tier 4: Wraith Archon -->
    <!-- Floating Spectral Crown -->
    <g class="ghost-crown" transform="translate(0, -42)">
      <path d="M -18 0 L -12 -14 L -4 -4 L 0 -18 L 4 -4 L 12 -14 L 18 0 Z" fill="${langColor}" opacity="0.95" filter="url(#core-glow)" />
      <circle cx="0" cy="-18" r="2.5" fill="#ffffff" />
      <circle cx="-12" cy="-14" r="1.8" fill="#ffffff" />
      <circle cx="12" cy="-14" r="1.8" fill="#ffffff" />
    </g>

    <!-- Grand Spectral Mantle / Body -->
    <path class="ghost-body" d="M 0 -36 C 30 -36, 36 -12, 34 16 C 32 36, 22 42, 16 28 C 10 16, 2 44, -4 28 C -10 14, -20 40, -26 26 C -32 14, -36 -12, 0 -36 Z"
          fill="url(#ghost-grad-${id})" filter="url(#glow-${id})" />

    <!-- Flowing Side Mantles -->
    <path d="M -28 -6 Q -42 12 -34 28 Q -28 14 -24 4 Z" fill="url(#ghost-grad-${id})" opacity="0.75" />
    <path d="M 28 -6 Q 42 12 34 28 Q 28 14 24 4 Z" fill="url(#ghost-grad-${id})" opacity="0.75" />

    <!-- Orbiting Energy Motes -->
    <circle cx="-36" cy="-8" r="3.5" fill="${langColor}" opacity="0.85" filter="url(#core-glow)" />
    <circle cx="36" cy="12" r="3.5" fill="${langColor}" opacity="0.85" filter="url(#core-glow)" />

    <!-- Blazing Soul Flame Core -->
    <path d="M 0 -14 C 10 -4, 12 10, 0 18 C -12 10, -10 -4, 0 -14 Z" fill="${langColor}" opacity="0.9" filter="url(#core-glow)" />
    <path d="M 0 -8 C 6 0, 7 8, 0 13 C -7 8, -6 0, 0 -8 Z" fill="#ffffff" opacity="0.95" />

    <!-- Intimidating Slit Eyes -->
    <path d="M -14 -12 Q -7 -14 -4 -8 Q -10 -8 -14 -12 Z" fill="#020617" />
    <path d="M 14 -12 Q 7 -14 4 -8 Q 10 -8 14 -12 Z" fill="#020617" />
    <ellipse cx="-8.5" cy="-10" rx="2" ry="1.2" fill="#38bdf8" />
    <ellipse cx="8.5" cy="-10" rx="2" ry="1.2" fill="#38bdf8" />
  `;
}

/**
 * Render Tier 5: Ancient Eldritch Titan (500+ commits)
 */
function renderTier5(langColor, id) {
  return `
    <!-- Tier 5: Ancient Eldritch Titan -->
    <!-- Cosmic Runic Halo Ring Behind Ghost -->
    <circle cx="0" cy="-6" r="46" fill="none" stroke="${langColor}" stroke-width="1.8" stroke-dasharray="8 6" opacity="0.65" filter="url(#core-glow)">
      <animateTransform attributeName="transform" type="rotate" from="0 0 -6" to="360 0 -6" dur="20s" repeatCount="indefinite" />
    </circle>
    <circle cx="0" cy="-6" r="52" fill="none" stroke="#ffffff" stroke-width="0.8" stroke-dasharray="3 9" opacity="0.4">
      <animateTransform attributeName="transform" type="rotate" from="360 0 -6" to="0 0 -6" dur="28s" repeatCount="indefinite" />
    </circle>

    <!-- Imperial Eldritch Horns -->
    <path d="M -22 -28 Q -38 -54 -48 -44 Q -36 -32 -20 -18 Z" fill="${langColor}" opacity="0.95" filter="url(#core-glow)" />
    <path d="M 22 -28 Q 38 -54 48 -44 Q 36 -32 20 -18 Z" fill="${langColor}" opacity="0.95" filter="url(#core-glow)" />

    <!-- Majestic Crown -->
    <g class="ghost-crown" transform="translate(0, -48)">
      <polygon points="0,-16 6,-2 18,-10 12,4 0,0 -12,4 -18,-10 -6,-2" fill="#fbbf24" filter="url(#core-glow)" />
      <circle cx="0" cy="-16" r="3.2" fill="#ffffff" />
      <circle cx="-18" cy="-10" r="2.2" fill="${langColor}" />
      <circle cx="18" cy="-10" r="2.2" fill="${langColor}" />
    </g>

    <!-- Massive Spectral Titan Robe -->
    <path class="ghost-body" d="M 0 -42 C 38 -42, 44 -14, 40 22 C 36 46, 26 52, 18 36 C 10 20, 2 54, -4 34 C -10 18, -22 52, -30 32 C -42 16, -44 -14, 0 -42 Z"
          fill="url(#ghost-grad-${id})" filter="url(#glow-${id})" />

    <!-- Cascading Spectral Wings / Ribbons -->
    <path d="M -36 -12 Q -56 12 -46 36 Q -38 18 -30 2 Z" fill="url(#ghost-grad-${id})" opacity="0.85" />
    <path d="M 36 -12 Q 56 12 46 36 Q 38 18 30 2 Z" fill="url(#ghost-grad-${id})" opacity="0.85" />

    <!-- Orbiting Familiars (3 baby wisps orbiting the titan) -->
    <g>
      <circle cx="-42" cy="-20" r="4" fill="${langColor}" opacity="0.9" filter="url(#core-glow)">
        <animate attributeName="cy" values="-24;-16;-24" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="42" cy="-10" r="4.5" fill="#38bdf8" opacity="0.9" filter="url(#core-glow)">
        <animate attributeName="cy" values="-8;-16;-8" dur="2.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="0" cy="46" r="3" fill="#ffffff" opacity="0.8" filter="url(#core-glow)">
        <animate attributeName="cx" values="-8;8;-8" dur="3.2s" repeatCount="indefinite" />
      </circle>
    </g>

    <!-- Supernova Soul Core -->
    <polygon points="0,-18 12,0 0,18 -12,0" fill="${langColor}" opacity="0.95" filter="url(#core-glow)" />
    <polygon points="0,-12 8,0 0,12 -8,0" fill="#ffffff" opacity="0.98" />

    <!-- Eldritch Celestial Eyes -->
    <polygon points="-16,-14 -4,-10 -8,-5 -18,-9" fill="#020617" />
    <polygon points="16,-14 4,-10 8,-5 18,-9" fill="#020617" />
    <circle cx="-10" cy="-10" r="2.4" fill="#fbbf24" />
    <circle cx="10" cy="-10" r="2.4" fill="#fbbf24" />
    <circle cx="-9" cy="-11" r="0.9" fill="#ffffff" />
    <circle cx="11" cy="-11" r="0.9" fill="#ffffff" />
  `;
}

/**
 * Generate full SVG element for a repository ghost
 */
function renderGhost(repo, index, posX, posY, theme) {
  const commits = repo.commits || 1;
  const stars = repo.stars || 0;
  const lang = repo.language || 'Unknown';
  const langColor = getLanguageColor(lang);
  const tierInfo = getGhostTier(commits);
  const id = `ghost-${index}`;
  const repoName = repo.name.length > 14 ? repo.name.slice(0, 13) + '…' : repo.name;

  // Render specific tier graphics
  let ghostGraphic = '';
  switch (tierInfo.tier) {
    case 5:
      ghostGraphic = renderTier5(langColor, id);
      break;
    case 4:
      ghostGraphic = renderTier4(langColor, id);
      break;
    case 3:
      ghostGraphic = renderTier3(langColor, id);
      break;
    case 2:
      ghostGraphic = renderTier2(langColor, id);
      break;
    default:
      ghostGraphic = renderTier1(langColor, id);
      break;
  }

  // Animation delay offset so ghosts don't float in robotic unison
  const delay = (index * 0.42).toFixed(2);
  const floatAnimName = `float-${index % 4}`;

  return `
    <!-- Defs for Ghost #${index} -->
    <defs>
      <linearGradient id="ghost-grad-${id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98" />
        <stop offset="45%" stop-color="#dbeafe" stop-opacity="0.88" />
        <stop offset="85%" stop-color="${langColor}" stop-opacity="0.7" />
        <stop offset="100%" stop-color="${langColor}" stop-opacity="0.1" />
      </linearGradient>
      <filter id="glow-${id}" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${tierInfo.glowRadius / 2}" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <!-- Ghost Entity Group with Link -->
    <g class="ghost-entity" id="${id}" transform="translate(${posX}, ${posY})">
      <a href="https://github.com/${repo.owner}/${repo.name}" target="_blank" rel="noopener noreferrer">
        <!-- Floating Animated Container -->
        <g style="animation: ${floatAnimName} ${tierInfo.floatDuration} ease-in-out infinite; animation-delay: -${delay}s;">
          
          <!-- Spectral Ground Shadow -->
          <ellipse cx="0" cy="54" rx="20" ry="5" fill="#000000" opacity="0.3" filter="url(#jungle-blur)">
            <animate attributeName="rx" values="16;22;16" dur="${tierInfo.floatDuration}" repeatCount="indefinite" begin="-${delay}s" />
            <animate attributeName="opacity" values="0.35;0.18;0.35" dur="${tierInfo.floatDuration}" repeatCount="indefinite" begin="-${delay}s" />
          </ellipse>

          <!-- Core Ghost Graphic Scaled -->
          <g transform="scale(${tierInfo.scale})">
            ${ghostGraphic}
          </g>

          <!-- Star Badge (if repo has stars) -->
          ${stars > 0 ? `
            <g transform="translate(18, -32)">
              <polygon points="0,-6 2,-1 7,-1 3,2 5,7 0,4 -5,7 -3,2 -7,-1 -2,-1" fill="#fbbf24" filter="url(#core-glow)" />
              <text x="9" y="1" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-size="9" font-weight="700" fill="#fde68a">${stars}</text>
            </g>
          ` : ''}

          <!-- Repository Floating Stone Plaque -->
          <g transform="translate(0, 68)" class="repo-plaque">
            <!-- Background Pill -->
            <rect x="-62" y="-12" width="124" height="24" rx="12" fill="${theme.cardBg}" stroke="${theme.accentBorder}" stroke-width="1.2" backdrop-filter="blur(4px)" />
            
            <!-- Language Pip -->
            <circle cx="-50" cy="0" r="4" fill="${langColor}" />

            <!-- Repo Name -->
            <text x="-42" y="3.5" font-family="'Segoe UI', Roboto, sans-serif" font-size="10.5" font-weight="600" fill="${theme.textColor}">
              ${repoName}
            </text>

            <!-- Commit Counter Mini Pill -->
            <g transform="translate(38, 0)">
              <rect x="-14" y="-8" width="30" height="16" rx="8" fill="${langColor}" fill-opacity="0.25" stroke="${langColor}" stroke-width="0.8" />
              <text x="1" y="3" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="700" fill="${theme.textColor}">
                ${commits}
              </text>
            </g>
          </g>

          <!-- Ghost Tier Sub-tag -->
          <text x="0" y="93" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="500" fill="${theme.textDim}" opacity="0.85">
            ${tierInfo.badge}
          </text>
        </g>
      </a>
    </g>
  `;
}

module.exports = {
  getGhostTier,
  renderGhost
};
