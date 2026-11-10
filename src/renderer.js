/**
 * Ghost Jungle - Master SVG Jungle Renderer
 * 
 * Assembles the full enchanted jungle environment, canopy vines, ancient ruins,
 * fireflies, mist layers, glowing flora, and spectral repository ghosts.
 */

const { getTheme } = require('./themes');
const { renderGhost } = require('./ghost-sprites');

/**
 * Calculate optimal ghost coordinates based on count
 */
function calculateGhostPositions(count, width = 880, height = 500) {
  const positions = [];
  
  if (count <= 4) {
    // Single row / clearing
    const stepX = width / (count + 1);
    for (let i = 0; i < count; i++) {
      positions.push({
        x: Math.round(stepX * (i + 1)),
        y: Math.round(height * 0.48 + (i % 2 === 0 ? -15 : 15))
      });
    }
  } else if (count <= 6) {
    // 2 rows: 3 top, 3 bottom staggered
    const topCount = Math.ceil(count / 2);
    const bottomCount = count - topCount;
    const stepTop = width / (topCount + 1);
    const stepBottom = width / (bottomCount + 1);

    for (let i = 0; i < topCount; i++) {
      positions.push({
        x: Math.round(stepTop * (i + 1)),
        y: 190 + (i % 2 === 0 ? -12 : 12)
      });
    }
    for (let i = 0; i < bottomCount; i++) {
      positions.push({
        x: Math.round(stepBottom * (i + 1)),
        y: 345 + (i % 2 === 0 ? 10 : -10)
      });
    }
  } else {
    // 2 rows: 4 top, 4 bottom (up to 8)
    const topCount = Math.ceil(count / 2);
    const bottomCount = count - topCount;
    const stepTop = width / (topCount + 1);
    const stepBottom = width / (bottomCount + 1);

    for (let i = 0; i < topCount; i++) {
      positions.push({
        x: Math.round(stepTop * (i + 1)),
        y: 185 + (i % 2 === 0 ? -15 : 15)
      });
    }
    for (let i = 0; i < bottomCount; i++) {
      positions.push({
        x: Math.round(stepBottom * (i + 1)),
        y: 340 + (i % 2 === 0 ? 12 : -12)
      });
    }
  }

  return positions;
}

/**
 * Calculate canopy danger rank based on total commits
 */
function getCanopyRank(totalCommits) {
  if (totalCommits >= 3000) return { rank: 'Mythic SSS', color: '#f59e0b' };
  if (totalCommits >= 1500) return { rank: 'Elder S-Rank', color: '#ec4899' };
  if (totalCommits >= 800) return { rank: 'Ancient A-Rank', color: '#a855f7' };
  if (totalCommits >= 300) return { rank: 'Haunted B-Rank', color: '#38bdf8' };
  if (totalCommits >= 100) return { rank: 'Awakened C-Rank', color: '#34d399' };
  return { rank: 'Whispering D-Rank', color: '#94a3b8' };
}

/**
 * Render complete Ghost Jungle SVG
 */
function renderJungleSvg(userData, options = {}) {
  const themeName = options.theme || 'midnight';
  const theme = getTheme(themeName);
  const width = parseInt(options.width, 10) || 880;
  const height = parseInt(options.height, 10) || 500;
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 8, 1), 10);

  const username = userData.username || 'Mystic Wanderer';
  const repos = (userData.repos || []).slice(0, limit);
  const totalCommits = userData.totalCommits || repos.reduce((sum, r) => sum + (r.commits || 1), 0);
  const totalStars = userData.totalStars || repos.reduce((sum, r) => sum + (r.stars || 0), 0);
  const canopyRank = getCanopyRank(totalCommits);

  const positions = calculateGhostPositions(repos.length, width, height);

  // Render ghosts
  const ghostElements = repos.map((repo, i) => {
    const pos = positions[i] || { x: 100 + i * 80, y: 240 };
    return renderGhost(repo, i, pos.x, pos.y, theme);
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${username}'s GitHub Ghost Jungle">
  <defs>
    <!-- Jungle Base Gradients -->
    <linearGradient id="sky-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${theme.bgGradient[0]}" />
      <stop offset="45%" stop-color="${theme.bgGradient[1]}" />
      <stop offset="100%" stop-color="${theme.bgGradient[2]}" />
    </linearGradient>

    <linearGradient id="moon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="60%" stop-color="${theme.moonColor}" />
      <stop offset="100%" stop-color="${theme.moonColor}" stop-opacity="0.6" />
    </linearGradient>

    <linearGradient id="mist-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${theme.mistColor}" stop-opacity="0" />
      <stop offset="30%" stop-color="${theme.mistColor}" stop-opacity="0.45" />
      <stop offset="70%" stop-color="${theme.mistColor}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${theme.mistColor}" stop-opacity="0" />
    </linearGradient>

    <linearGradient id="mist-grad-2" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="${theme.mistColor}" stop-opacity="0" />
      <stop offset="40%" stop-color="${theme.mistColor}" stop-opacity="0.5" />
      <stop offset="80%" stop-color="${theme.mistColor}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="${theme.mistColor}" stop-opacity="0" />
    </linearGradient>

    <linearGradient id="pedestal-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${theme.vinesColor}" />
      <stop offset="100%" stop-color="${theme.bgGradient[2]}" />
    </linearGradient>

    <!-- Filters -->
    <filter id="core-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="moon-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="jungle-blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" />
    </filter>
  </defs>

  <style>
    /* GitHub README Safe CSS Animations */
    @keyframes float-0 {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-10px) rotate(-1.5deg); }
    }
    @keyframes float-1 {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-13px) rotate(1.8deg); }
    }
    @keyframes float-2 {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(-1.2deg); }
    }
    @keyframes float-3 {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-12px) rotate(1.5deg); }
    }

    @keyframes pulse-moon {
      0%, 100% { transform: scale(1); opacity: 0.85; }
      50% { transform: scale(1.04); opacity: 1; }
    }

    @keyframes mist-drift-left {
      0% { transform: translateX(0); }
      50% { transform: translateX(-40px); }
      100% { transform: translateX(0); }
    }

    @keyframes mist-drift-right {
      0% { transform: translateX(0); }
      50% { transform: translateX(45px); }
      100% { transform: translateX(0); }
    }

    @keyframes firefly-twinkle {
      0%, 100% { opacity: 0.2; transform: translateY(0) scale(0.8); }
      50% { opacity: 0.95; transform: translateY(-14px) scale(1.2); }
    }

    @keyframes vine-sway-left {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(2.5deg); }
    }

    @keyframes vine-sway-right {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-2.8deg); }
    }

    @keyframes eye-blink {
      0%, 94%, 100% { transform: scaleY(1); }
      96%, 98% { transform: scaleY(0.08); }
    }

    .ghost-entity {
      cursor: pointer;
      transition: transform 0.25s ease;
    }
    .ghost-entity:hover {
      filter: brightness(1.25);
    }
  </style>

  <!-- BACKGROUND: Deep Jungle Night -->
  <rect width="${width}" height="${height}" rx="16" fill="url(#sky-grad)" stroke="${theme.accentBorder}" stroke-width="1.5" />

  <!-- CELESTIAL MOON / ECLIPSE -->
  <g transform="translate(${Math.round(width * 0.76)}, 85)">
    <!-- Outer Halo -->
    <circle cx="0" cy="0" r="70" fill="${theme.moonGlow}" filter="url(#moon-soft-glow)" />
    <!-- Secondary Halo Ring -->
    <circle cx="0" cy="0" r="50" fill="none" stroke="${theme.moonColor}" stroke-width="1" stroke-dasharray="4 6" opacity="0.4" />
    <!-- Core Moon -->
    <circle cx="0" cy="0" r="34" fill="url(#moon-grad)" filter="url(#core-glow)" style="animation: pulse-moon 7s ease-in-out infinite;" />
    <!-- Moon Craters / Eclipse Shading -->
    <circle cx="8" cy="-6" r="6" fill="${theme.bgGradient[1]}" opacity="0.25" />
    <circle cx="-10" cy="8" r="9" fill="${theme.bgGradient[1]}" opacity="0.2" />
    <circle cx="5" cy="14" r="5" fill="${theme.bgGradient[1]}" opacity="0.18" />
  </g>

  <!-- DISTANT JUNGLE CANOPY SILHOUETTES -->
  <g fill="${theme.foliageColor}" opacity="0.6">
    <path d="M 0 160 Q 90 120 180 150 Q 280 110 380 145 Q 490 100 600 140 Q 720 115 880 160 L 880 320 L 0 320 Z" />
    <path d="M 0 200 Q 140 170 260 210 Q 420 160 580 205 Q 740 175 880 220 L 880 400 L 0 400 Z" opacity="0.7" />
  </g>

  <!-- DRIFTING JUNGLE MIST (LAYER 1) -->
  <g style="animation: mist-drift-left 14s ease-in-out infinite;">
    <path d="M -50 240 C 150 200, 300 270, 520 220 C 720 180, 850 250, 950 230 L 950 340 C 800 370, 600 320, 400 360 C 200 400, 50 330, -50 350 Z"
          fill="url(#mist-grad-1)" />
  </g>

  <!-- TOP CANOPY OVERHANGING BRANCHES & VINES -->
  <!-- Top Left Massive Branch -->
  <g style="transform-origin: 0 0; animation: vine-sway-left 8s ease-in-out infinite;">
    <path d="M 0 0 L 260 0 C 240 25, 200 45, 150 55 C 100 65, 40 70, 0 85 Z" fill="${theme.vinesColor}" />
    <!-- Vines hanging down from branch -->
    <path d="M 45 65 Q 40 120 48 165 Q 52 195 44 215" fill="none" stroke="${theme.vinesColor}" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="44" cy="217" r="3" fill="${theme.floraGlow}" opacity="0.8" filter="url(#core-glow)" />

    <path d="M 95 60 Q 110 130 92 180 Q 82 220 90 250" fill="none" stroke="${theme.vinesColor}" stroke-width="2" stroke-linecap="round" />
    <circle cx="90" cy="252" r="3.5" fill="${theme.floraGlow}" opacity="0.9" filter="url(#core-glow)" />

    <path d="M 165 48 Q 155 95 168 140" fill="none" stroke="${theme.vinesColor}" stroke-width="2.2" stroke-linecap="round" />
    
    <!-- Leaves on branch -->
    <path d="M 60 70 C 50 85, 52 105, 68 100 C 78 95, 75 75, 60 70 Z" fill="${theme.foliageColor}" />
    <path d="M 125 55 C 135 70, 148 85, 142 98 C 130 102, 120 85, 125 55 Z" fill="${theme.foliageColor}" />
    <path d="M 190 35 C 205 50, 218 62, 210 75 C 198 78, 185 60, 190 35 Z" fill="${theme.foliageColor}" />
  </g>

  <!-- Top Right Canopy Branch -->
  <g style="transform-origin: ${width}px 0; animation: vine-sway-right 9s ease-in-out infinite;">
    <path d="M ${width} 0 L ${width - 240} 0 C ${width - 200} 30, ${width - 150} 50, ${width - 90} 65 C ${width - 40} 75, ${width - 10} 80, ${width} 90 Z" fill="${theme.vinesColor}" />
    <!-- Vines hanging down -->
    <path d="M ${width - 70} 68 Q ${width - 80} 130 ${width - 65} 185 Q ${width - 55} 230 ${width - 68} 260" fill="none" stroke="${theme.vinesColor}" stroke-width="2.8" stroke-linecap="round" />
    <circle cx="${width - 68}" cy="262" r="3.5" fill="${theme.floraGlow}" opacity="0.85" filter="url(#core-glow)" />

    <path d="M ${width - 145} 52 Q ${width - 135} 105 ${width - 148} 150" fill="none" stroke="${theme.vinesColor}" stroke-width="2" stroke-linecap="round" />
    <circle cx="${width - 148}" cy="152" r="2.8" fill="${theme.mushroomCap}" opacity="0.9" filter="url(#core-glow)" />

    <!-- Jungle leaves -->
    <path d="M ${width - 110} 60 C ${width - 120} 78, ${width - 115} 95, ${width - 98} 90 C ${width - 90} 82, ${width - 95} 68, ${width - 110} 60 Z" fill="${theme.foliageColor}" />
    <path d="M ${width - 180} 40 C ${width - 195} 55, ${width - 190} 72, ${width - 175} 68 C ${width - 165} 62, ${width - 170} 48, ${width - 180} 40 Z" fill="${theme.foliageColor}" />
  </g>

  <!-- TREE HOLLOW WITH BLINKING SPOOKY EYES -->
  <g transform="translate(38, 105)">
    <!-- Dark hollow -->
    <ellipse cx="0" cy="0" rx="9" ry="14" fill="#010408" />
    <!-- Eyes blinking -->
    <g style="animation: eye-blink 5.5s infinite; transform-origin: 0 0;">
      <circle cx="-3" cy="0" r="1.8" fill="${theme.fireflyColor}" filter="url(#core-glow)" />
      <circle cx="3" cy="0" r="1.8" fill="${theme.fireflyColor}" filter="url(#core-glow)" />
      <circle cx="-3" cy="0" r="0.7" fill="#ffffff" />
      <circle cx="3" cy="0" r="0.7" fill="#ffffff" />
    </g>
  </g>

  <!-- JUNGLE RUINS / ANCIENT PEDESTALS & BASE MOSS -->
  <!-- Left Ancient Pillar Pedestal -->
  <g transform="translate(55, 415)">
    <polygon points="-24,0 24,0 18,65 -18,65" fill="url(#pedestal-grad)" stroke="${theme.vinesColor}" stroke-width="1.2" />
    <rect x="-28" y="-6" width="56" height="8" rx="2" fill="${theme.vinesColor}" />
    <!-- Runic carved glyph -->
    <path d="M -8 18 L 0 10 L 8 18 L 0 26 Z M 0 26 L 0 38" fill="none" stroke="${theme.floraGlow}" stroke-width="1.2" opacity="0.6" filter="url(#core-glow)" />
  </g>

  <!-- Right Ancient Pillar Pedestal -->
  <g transform="translate(${width - 65}, 420)">
    <polygon points="-22,0 22,0 16,60 -16,60" fill="url(#pedestal-grad)" stroke="${theme.vinesColor}" stroke-width="1.2" />
    <rect x="-26" y="-6" width="52" height="8" rx="2" fill="${theme.vinesColor}" />
    <!-- Runic glyph -->
    <circle cx="0" cy="22" r="6" fill="none" stroke="${theme.floraGlow}" stroke-width="1" opacity="0.55" filter="url(#core-glow)" />
    <path d="M -4 22 L 4 22 M 0 18 L 0 26" stroke="${theme.floraGlow}" stroke-width="1" opacity="0.6" />
  </g>

  <!-- FOREST FLOOR & ROOTS -->
  <path d="M 0 ${height - 40} 
           Q 120 ${height - 65} 240 ${height - 42} 
           Q 380 ${height - 25} 510 ${height - 48} 
           Q 670 ${height - 70} 800 ${height - 40} 
           L ${width} ${height - 45} L ${width} ${height} L 0 ${height} Z" 
        fill="${theme.foliageColor}" />

  <path d="M 0 ${height - 25} 
           Q 180 ${height - 45} 360 ${height - 22} 
           Q 560 ${height - 50} 740 ${height - 28} 
           L ${width} ${height - 30} L ${width} ${height} L 0 ${height} Z" 
        fill="${theme.bgGradient[2]}" opacity="0.9" />

  <!-- BIOLUMINESCENT MUSHROOMS ON ROOTS -->
  <!-- Mushroom cluster 1 (Left) -->
  <g transform="translate(130, ${height - 42})">
    <!-- Big shroom -->
    <path d="M -3 0 Q -2 -14 0 -18 Q 2 -14 3 0" fill="${theme.mushroomStem}" />
    <path d="M -12 -18 C -12 -28 12 -28 12 -18 C 8 -16 -8 -16 -12 -18 Z" fill="${theme.mushroomCap}" filter="url(#core-glow)" />
    <circle cx="-4" cy="-22" r="1.2" fill="#ffffff" opacity="0.8" />
    <circle cx="4" cy="-21" r="1.5" fill="#ffffff" opacity="0.8" />
    <!-- Small shroom -->
    <path d="M 10 0 Q 11 -8 13 -12" stroke="${theme.mushroomStem}" stroke-width="2.2" stroke-linecap="round" />
    <path d="M 7 -12 C 7 -18 19 -18 19 -12 Z" fill="${theme.mushroomCap}" opacity="0.9" filter="url(#core-glow)" />
  </g>

  <!-- Mushroom cluster 2 (Center) -->
  <g transform="translate(${Math.round(width * 0.48)}, ${height - 38})">
    <path d="M -2 0 Q -1 -12 0 -15" stroke="${theme.mushroomStem}" stroke-width="2.5" stroke-linecap="round" />
    <path d="M -10 -15 C -10 -24 10 -24 10 -15 Z" fill="${theme.mushroomCap}" filter="url(#core-glow)" />
    <circle cx="0" cy="-19" r="1.5" fill="#ffffff" opacity="0.85" />
    <!-- Mini shroom -->
    <path d="M -12 0 Q -11 -6 -13 -9" stroke="${theme.mushroomStem}" stroke-width="2" stroke-linecap="round" />
    <path d="M -17 -9 C -17 -14 -9 -14 -9 -9 Z" fill="${theme.mushroomCap}" opacity="0.8" />
  </g>

  <!-- Mushroom cluster 3 (Right) -->
  <g transform="translate(${width - 150}, ${height - 44})">
    <path d="M 0 0 Q 2 -14 0 -20" stroke="${theme.mushroomStem}" stroke-width="3" stroke-linecap="round" />
    <path d="M -14 -20 C -14 -32 14 -32 14 -20 Z" fill="${theme.mushroomCap}" filter="url(#core-glow)" />
    <circle cx="-5" cy="-25" r="1.6" fill="#ffffff" opacity="0.85" />
    <circle cx="5" cy="-24" r="1.3" fill="#ffffff" opacity="0.85" />
  </g>

  <!-- DRIFTING JUNGLE MIST (LAYER 2 - FOREGROUND) -->
  <g style="animation: mist-drift-right 18s ease-in-out infinite;">
    <path d="M -40 ${height - 90} C 160 ${height - 130}, 340 ${height - 70}, 560 ${height - 110} C 740 ${height - 140}, 880 ${height - 80}, 980 ${height - 100} L 980 ${height} L -40 ${height} Z"
          fill="url(#mist-grad-2)" />
  </g>

  <!-- FLOATING FIREFLIES / SPECTRAL MOTES -->
  <g>
    <circle cx="95" cy="280" r="2.2" fill="${theme.fireflyColor}" filter="url(#core-glow)" style="animation: firefly-twinkle 3.2s ease-in-out infinite;" />
    <circle cx="210" cy="140" r="1.8" fill="${theme.fireflyColor}" filter="url(#core-glow)" style="animation: firefly-twinkle 4.1s ease-in-out infinite 0.7s;" />
    <circle cx="320" cy="260" r="2.5" fill="${theme.fireflyColor}" filter="url(#core-glow)" style="animation: firefly-twinkle 3.7s ease-in-out infinite 1.4s;" />
    <circle cx="430" cy="160" r="2.0" fill="${theme.fireflyColor}" filter="url(#core-glow)" style="animation: firefly-twinkle 4.5s ease-in-out infinite 0.3s;" />
    <circle cx="560" cy="240" r="2.4" fill="${theme.fireflyColor}" filter="url(#core-glow)" style="animation: firefly-twinkle 3.9s ease-in-out infinite 2.1s;" />
    <circle cx="680" cy="170" r="1.9" fill="${theme.fireflyColor}" filter="url(#core-glow)" style="animation: firefly-twinkle 4.8s ease-in-out infinite 1.1s;" />
    <circle cx="790" cy="270" r="2.3" fill="${theme.fireflyColor}" filter="url(#core-glow)" style="animation: firefly-twinkle 3.5s ease-in-out infinite 1.8s;" />
    <circle cx="160" cy="380" r="2.0" fill="${theme.fireflyColor}" filter="url(#core-glow)" style="animation: firefly-twinkle 4.3s ease-in-out infinite 2.5s;" />
    <circle cx="720" cy="390" r="2.2" fill="${theme.fireflyColor}" filter="url(#core-glow)" style="animation: firefly-twinkle 3.8s ease-in-out infinite 0.9s;" />
  </g>

  <!-- ==================== GHOST REPOSITORIES ==================== -->
  <g id="ghost-sanctuary">
    ${ghostElements}
  </g>

  <!-- ==================== HEADER HUD BAR ==================== -->
  <g transform="translate(24, 20)">
    <!-- Header Pill Background -->
    <rect x="0" y="0" width="${width - 48}" height="42" rx="21" fill="${theme.cardBg}" stroke="${theme.accentBorder}" stroke-width="1.2" backdrop-filter="blur(8px)" />

    <!-- Ghost Jungle Icon -->
    <g transform="translate(22, 21)">
      <circle cx="0" cy="0" r="12" fill="${theme.floraGlow}" fill-opacity="0.2" stroke="${theme.floraGlow}" stroke-width="1.2" />
      <path d="M -5 -4 C -5 -9, 5 -9, 5 -4 C 5 4, 3 6, 0 4 C -3 6, -5 4, -5 -4 Z" fill="${theme.floraGlow}" filter="url(#core-glow)" />
      <circle cx="-2" cy="-4" r="0.9" fill="#000000" />
      <circle cx="2" cy="-4" r="0.9" fill="#000000" />
    </g>

    <!-- Title & Username -->
    <text x="44" y="22" font-family="'Segoe UI', Roboto, -apple-system, sans-serif" font-size="14" font-weight="700" fill="${theme.textColor}">
      ${username}'s Haunted Jungle
    </text>
    <text x="44" y="33" font-family="'Segoe UI', Roboto, -apple-system, sans-serif" font-size="9" font-weight="500" fill="${theme.textDim}">
      Living Spirit Ecosystem • Evolving by Commits
    </text>

    <!-- Stats Badges (Right Side) -->
    <g transform="translate(${width - 48 - 18}, 21)">
      <!-- Rank Badge -->
      <g transform="translate(-5, 0)">
        <rect x="-85" y="-12" width="85" height="24" rx="12" fill="${canopyRank.color}" fill-opacity="0.18" stroke="${canopyRank.color}" stroke-width="1" />
        <text x="-42" y="4" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="${canopyRank.color}">
          ${canopyRank.rank}
        </text>
      </g>

      <!-- Commits Badge -->
      <g transform="translate(-100, 0)">
        <rect x="-95" y="-12" width="90" height="24" rx="12" fill="${theme.bgGradient[1]}" stroke="${theme.accentBorder}" stroke-width="1" />
        <text x="-50" y="4" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" fill="${theme.textColor}">
          ⚡ ${totalCommits.toLocaleString()} commits
        </text>
      </g>

      <!-- Spirits Count Badge -->
      <g transform="translate(-200, 0)">
        <rect x="-85" y="-12" width="80" height="24" rx="12" fill="${theme.bgGradient[1]}" stroke="${theme.accentBorder}" stroke-width="1" />
        <text x="-45" y="4" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" fill="${theme.textColor}">
          👻 ${repos.length} spirits
        </text>
      </g>
    </g>
  </g>

  <!-- ==================== FOOTER / TIER LEGEND ==================== -->
  <g transform="translate(24, ${height - 24})">
    <!-- Footer Pill -->
    <rect x="0" y="-10" width="${width - 48}" height="20" rx="10" fill="${theme.cardBg}" opacity="0.85" />
    
    <!-- Legend text -->
    <text x="${(width - 48) / 2}" y="4" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="500" fill="${theme.textDim}">
      <tspan fill="#38bdf8">🌱 Wisp (&lt;10)</tspan>
      <tspan fill="${theme.textDim}"> • </tspan>
      <tspan fill="#34d399">🌿 Specter (10+)</tspan>
      <tspan fill="${theme.textDim}"> • </tspan>
      <tspan fill="#a855f7">🔮 Phantom (50+)</tspan>
      <tspan fill="${theme.textDim}"> • </tspan>
      <tspan fill="#ec4899">👑 Wraith (200+)</tspan>
      <tspan fill="${theme.textDim}"> • </tspan>
      <tspan fill="#fbbf24">🌌 Ancient Titan (500+)</tspan>
    </text>
  </g>
</svg>`;
}

module.exports = {
  renderJungleSvg,
  getCanopyRank
};
