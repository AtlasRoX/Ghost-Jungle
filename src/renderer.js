/**
 * Ghost Jungle - Cinematic SVG Scene Renderer
 *
 * Layer stack (back to front):
 *   sky → stars → moon corona → drifting clouds → volumetric moonlight
 *   → far ridge → haze → mid canopy → trunks → fireflies → spirits
 *   → forest floor → foreground mist → falling leaves → overhead canopy
 *   → grade (vignette, letterbox, grain) → HUD (title, stats, rank dial)
 *
 * The scene is authored on a fixed 880×400 stage (2.2:1). `width`/`height`
 * only scale the output, so the composition never breaks.
 *
 * Every repository is shown. Each spirit wanders its own random route
 * (a closed Catmull-Rom spline through random waypoints, some beyond the
 * frame edges), easing in and out of each waypoint, sometimes pausing to
 * hover, growing as it drifts toward the viewer and receding as it drifts
 * back. Pure SVG + CSS + SMIL: safe inside GitHub's Camo image proxy.
 *
 * mode 'interactive' omits the wander animation so the web playground can
 * drive the spirits with its own physics (drag, throw, flee, wander).
 */

const fs = require('fs');
const path = require('path');
const { getTheme, mix } = require('./themes');
const { renderGhost, TIERS, escapeXml, textWidth, SHARED_DEFS, GHOST_CSS } = require('./ghost-sprites');
const { computeRank } = require('./rank');

const W = 880;
const H = 400; // 2.2 : 1 cinematic frame
const FONT = `'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;

/* Google Sans, embedded (Camo blocks external fonts). See assets/fonts/README.md */
const FONT_FACES = [500, 700].map(w => {
  try {
    const b64 = fs.readFileSync(path.join(__dirname, '..', 'assets', 'fonts', `GoogleSans-${w}-subset.woff2`)).toString('base64');
    return `@font-face { font-family: 'Google Sans'; font-weight: ${w}; font-style: normal; src: url(data:font/woff2;base64,${b64}) format('woff2'); }`;
  } catch (e) {
    return '';
  }
}).join('\n    ');

/* ------------------------------------------------------------------ */
/* Deterministic randomness: every username gets its own jungle.       */
/* ------------------------------------------------------------------ */

function seededRandom(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const r1 = n => Math.round(n * 10) / 10;
const r3 = n => Math.round(n * 1000) / 1000;
const fmt = n => Number(n || 0).toLocaleString('en-US');

/* ------------------------------------------------------------------ */
/* Procedural silhouettes                                              */
/* ------------------------------------------------------------------ */

/** Rolling canopy line: a chain of soft bumps closed down to the floor */
function canopyPath(rand, baseY, minW, maxW, minH, maxH) {
  let x = -40;
  let y = baseY;
  let d = `M ${x} ${H + 10} L ${x} ${y}`;
  while (x < W + 40) {
    const w = minW + rand() * (maxW - minW);
    const h = minH + rand() * (maxH - minH);
    const ny = baseY + (rand() - 0.5) * 14;
    d += ` Q ${r1(x + w / 2)} ${r1(Math.min(y, ny) - h * 2)} ${r1(x + w)} ${r1(ny)}`;
    x += w;
    y = ny;
  }
  return `${d} L ${r1(x)} ${H + 10} Z`;
}

/** Palm frond: a drooping midrib with paired leaflets */
function frondPath(ox, oy, angleDeg, len, leaf, droop = 0.35) {
  const a = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const pt = t => [ox + dx * len * t, oy + dy * len * t + len * droop * t * t];
  let d = '';
  const steps = 13;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const [x0, y0] = pt(t);
    const [x1, y1] = pt(t + 1 / steps);
    let tx = x1 - x0;
    let ty = y1 - y0;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const nx = -ty;
    const ny = tx;
    const l = leaf * Math.sin(Math.PI * t) * (0.55 + 0.45 * (1 - t));
    for (const s of [1, -1]) {
      const tipX = x0 + nx * l * s + tx * l * 0.55;
      const tipY = y0 + ny * l * s + ty * l * 0.55 + l * 0.35;
      d += `M ${r1(x0)} ${r1(y0)} L ${r1(tipX)} ${r1(tipY)} L ${r1(x1)} ${r1(y1)} Z `;
    }
  }
  const [ex, ey] = pt(1);
  const [mx, my] = pt(0.5);
  return { leaves: d, rib: `M ${ox} ${oy} Q ${r1(mx)} ${r1(my - len * droop * 0.12)} ${r1(ex)} ${r1(ey)}` };
}

function frondGroup(fronds, fill, ribWidth = 1.6) {
  return fronds.map(f => {
    const { leaves, rib } = frondPath(...f);
    return `<path d="${leaves}" fill="${fill}" /><path d="${rib}" fill="none" stroke="${fill}" stroke-width="${ribWidth}" stroke-linecap="round" />`;
  }).join('');
}

/** Tapered, slightly bowed tree trunk spanning the frame */
function trunkPath(x, topW, botW, bow) {
  return `M ${x - topW / 2} -10 C ${x - topW / 2 + bow} ${H * 0.35}, ${x - botW / 2 - bow} ${H * 0.7}, ${x - botW / 2} ${H + 10}
          L ${x + botW / 2} ${H + 10} C ${x + botW / 2 - bow} ${H * 0.7}, ${x + topW / 2 + bow} ${H * 0.35}, ${x + topW / 2} -10 Z`;
}

/** Soft cloud silhouette made of overlapping lobes */
function cloudPath(cx, cy, w, h, rand) {
  const lobes = 5;
  let d = `M ${r1(cx - w / 2)} ${r1(cy)}`;
  for (let i = 0; i < lobes; i++) {
    const x0 = cx - w / 2 + (w / lobes) * i;
    const x1 = x0 + w / lobes;
    const lift = h * (0.55 + rand() * 0.6) * Math.sin(Math.PI * (i + 0.5) / lobes);
    d += ` Q ${r1((x0 + x1) / 2)} ${r1(cy - lift * 2)} ${r1(x1)} ${r1(cy)}`;
  }
  d += ` Q ${r1(cx)} ${r1(cy + h * 0.5)} ${r1(cx - w / 2)} ${r1(cy)} Z`;
  return d;
}

/* ------------------------------------------------------------------ */
/* Wandering routes                                                    */
/* ------------------------------------------------------------------ */

const ROAM = { left: -70, right: W + 70, inLeft: 60, inRight: W - 60, speed: 22 };

/** Closed Catmull-Rom spline through points → cubic Bézier segments */
function splineSegments(pts) {
  const n = pts.length;
  const P = i => pts[((i % n) + n) % n];
  return pts.map((_, i) => {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    return [p1,
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2];
  });
}

function bezierLength([a, b, c, d]) {
  let len = 0;
  let prev = a;
  for (let k = 1; k <= 24; k++) {
    const t = k / 24, u = 1 - t;
    const p = [
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
    ];
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return len;
}

/**
 * A spirit's personal route. Waypoints wander the whole stage and sometimes
 * beyond its edges; the spirit eases into each waypoint and occasionally
 * lingers there, so motion reads as curious drifting rather than a loop.
 */
function wanderRoute(rand, s, tier, yTop, yBot, start) {
  const count = 5 + Math.floor(rand() * 3);
  const pts = [];
  for (let i = 0; i < count; i++) {
    const outside = rand() < 0.22;
    const x = outside
      ? (rand() < 0.5 ? ROAM.left + rand() * 40 : ROAM.right - rand() * 40)
      : ROAM.inLeft + rand() * (ROAM.inRight - ROAM.inLeft);
    const y = yTop + rand() * (yBot - yTop);
    pts.push([x, y, !outside]);
  }
  if (start) pts[0] = [start[0], start[1], true];
  else if (!pts.some(p => p[2])) pts[0] = [W / 2, (yTop + yBot) / 2, true];

  const segs = splineSegments(pts.map(p => [p[0], p[1]]));
  const lens = segs.map(bezierLength);
  const total = lens.reduce((a, b) => a + b, 0);

  // Bigger spirits move with more gravity
  const speed = ROAM.speed * (1.25 - tier * 0.09) * (0.8 + rand() * 0.4);
  const keyPoints = [0];
  const times = [0];
  const ys = [pts[0][1]];
  const wpAt = [0];
  const splines = [];
  let dist = 0;
  let t = 0;
  for (let i = 0; i < segs.length; i++) {
    dist += lens[i];
    t += lens[i] / speed;
    keyPoints.push(dist / total);
    times.push(t);
    ys.push(pts[(i + 1) % pts.length][1]);
    wpAt.push((i + 1) % pts.length);
    splines.push('0.45 0 0.55 1');
    if (rand() < 0.4) {               // linger: hover in place for a moment
      t += 1.2 + rand() * 2.4;
      keyPoints.push(dist / total);
      times.push(t);
      ys.push(pts[(i + 1) % pts.length][1]);
      wpAt.push((i + 1) % pts.length);
      splines.push('0 0 1 1');
    }
  }
  keyPoints[keyPoints.length - 1] = 1;
  const dur = t;
  const keyTimes = times.map(v => r3(v / dur));
  keyTimes[keyTimes.length - 1] = 1;

  const depthOf = y => s * (0.8 + 0.26 * (y - yTop) / Math.max(1, yBot - yTop));
  const scales = ys.map(y => r3(depthOf(y)));
  const opacities = ys.map(y => r3(0.62 + 0.38 * (y - yTop) / Math.max(1, yBot - yTop)));

  // Start (static frame) on a waypoint inside the frame
  const insideIdx = pts.map((p, i) => (p[2] ? i : -1)).filter(i => i >= 0);
  const startWp = start ? 0 : insideIdx[Math.floor(rand() * insideIdx.length)];
  const k0 = Math.max(0, wpAt.indexOf(startWp));
  const [sx, sy] = [pts[startWp][0], pts[startWp][1]];

  const rel = (x, y) => `${r1(x - sx)} ${r1(y - sy)}`;
  let d = `M ${rel(...segs[0][0])}`;
  for (const [, b, c, e] of segs) d += ` C ${rel(...b)} ${rel(...c)} ${rel(...e)}`;

  return {
    x: r1(sx),
    y: r1(sy),
    scale: scales[k0],
    roam: {
      path: d,
      dur: r1(dur),
      begin: r1(keyTimes[k0] * dur),
      keyTimes,
      keyPoints: keyPoints.map(r3),
      keySplines: splines,
      scales,
      opacities,
      opacity0: opacities[k0],
    },
  };
}

/** Base spirit size for a crowd of n */
const crowdScale = n => (n <= 8 ? 1 : Math.max(0.5, Math.sqrt(8 / n)));

/** Vertical band the spirits roam in, so crowns clear the HUD and captions clear the floor */
function roamBand(s) {
  return { yTop: 80 + 62 * s * 0.8, yBot: 376 - (56 * s * 1.06 + 28) };
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

const SVG_MAX_SPIRITS = 36;
const INTERACTIVE_MAX_SPIRITS = 60;

function renderJungleSvg(userData, options = {}) {
  const theme = getTheme(options.theme || 'midnight');
  const interactive = options.mode === 'interactive';
  const cap = interactive ? INTERACTIVE_MAX_SPIRITS : SVG_MAX_SPIRITS;
  const all = userData.repos || [];
  const limitN = parseInt(options.limit, 10);
  const limit = Math.min(Number.isFinite(limitN) && limitN > 0 ? limitN : all.length, cap);

  const outW = Math.min(Math.max(parseInt(options.width, 10) || W, 320), 2400);
  const outH = parseInt(options.height, 10) ? Math.min(Math.max(parseInt(options.height, 10), 145), 1100) : Math.round(outW * H / W);

  const username = String(userData.username || 'wanderer');
  const repos = all.slice(0, limit);
  const totalRepos = userData.totalRepos || all.length;
  const totalCommits = userData.totalCommits ?? all.reduce((s, r) => s + (r.commits || 0), 0);
  const totalStars = userData.totalStars ?? all.reduce((s, r) => s + (r.stars || 0), 0);
  const followers = userData.followers || 0;
  const rank = computeRank({ commits: totalCommits, stars: totalStars, followers, repos: totalRepos });

  const rand = seededRandom(`${username.toLowerCase()}::${options.theme || 'midnight'}`);

  // Palette derived from the theme (atmospheric perspective)
  const [sky0, sky1, sky2] = theme.bgGradient;
  const moon = theme.moonColor;
  const farFill = mix(theme.foliageColor, theme.mistColor, 0.62);
  const midFill = mix(theme.foliageColor, theme.mistColor, 0.28);
  const nearFill = mix(theme.foliageColor, '#000000', 0.35);
  const deepFill = mix(sky2, '#000000', 0.45);
  const haze = mix(theme.mistColor, moon, 0.18);
  const cloudFill = mix(sky1, theme.mistColor, 0.55);

  const MX = 440;
  const MY = 96;

  /* ---------- Stars ---------- */
  let stars = '';
  for (let i = 0; i < 90; i++) {
    const x = r1(rand() * W);
    const y = r1(rand() * 210 * Math.pow(rand(), 0.6));
    const r = r1(0.3 + rand() * 0.85);
    const o = (0.2 + rand() * 0.6).toFixed(2);
    const tw = i % 6 === 0 ? ` class="twinkle" style="animation-delay:-${r1(rand() * 6)}s"` : '';
    stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${o}"${tw} />`;
  }

  /* ---------- Volumetric moonlight ----------
     Wide, heavily blurred shafts that start below the moon and dissolve into
     the haze; they breathe slowly and shift as clouds pass. */
  const shafts = [-1.15, -0.5, 0.15, 0.75, 1.3].map((dir, i) => {
    const topW = 18 + rand() * 16;
    const botW = 70 + rand() * 70;
    const bx = MX + dir * 210 + (rand() - 0.5) * 40;
    const y0 = MY + 26;
    return `<polygon class="shaft shaft-${i % 3}" points="${r1(MX + dir * 14 - topW / 2)},${y0} ${r1(MX + dir * 14 + topW / 2)},${y0} ${r1(bx + botW / 2)},${H - 40} ${r1(bx - botW / 2)},${H - 40}" fill="url(#shaft-grad)" />`;
  }).join('');

  /* ---------- Silhouette layers ---------- */
  const farRidge = canopyPath(rand, 240, 26, 64, 10, 24);
  const midRidge = canopyPath(rand, 304, 44, 96, 12, 28);
  const groundLine = canopyPath(rand, 376, 18, 46, 3, 8);

  const farPalms = [
    [140, 240, -100, 34, 8, 0.5], [140, 240, -60, 36, 8, 0.5], [140, 240, -140, 32, 8, 0.5],
    [760, 244, -80, 36, 8, 0.5], [760, 244, -40, 34, 8, 0.5], [760, 244, -125, 34, 8, 0.5],
  ];

  const trunks = `
    <g fill="${midFill}">
      <path d="${trunkPath(66, 9, 16, 8)}" />
      <path d="${trunkPath(818, 8, 15, -7)}" />
    </g>
    <g fill="${nearFill}" stroke="${moon}" stroke-opacity="0.12" stroke-width="1">
      <path d="${trunkPath(14, 24, 44, 10)}" />
      <path d="${trunkPath(868, 22, 40, -12)}" />
    </g>`;

  const overheadFar = frondGroup([
    [-20, -24, 12, 170, 18, 0.28], [-20, -24, 34, 135, 16, 0.3], [40, -30, 62, 95, 13, 0.3],
    [900, -24, 168, 170, 18, 0.28], [900, -24, 146, 135, 16, 0.3], [840, -30, 118, 95, 13, 0.3],
  ], mix(theme.foliageColor, theme.mistColor, 0.15));
  const overheadNear = frondGroup([
    [-30, -30, 24, 120, 16, 0.32], [-30, -30, 52, 95, 14, 0.32], [-30, 30, 4, 95, 13, 0.4],
    [910, -30, 156, 120, 16, 0.32], [910, -30, 128, 95, 14, 0.32], [910, 30, 176, 95, 13, 0.4],
  ], nearFill, 2.2);

  const ferns = frondGroup([
    [-20, 420, -38, 130, 14, 0.42], [-20, 420, -62, 112, 12, 0.4], [40, 430, -80, 92, 11, 0.35],
    [900, 420, -142, 130, 14, 0.42], [900, 420, -118, 112, 12, 0.4], [840, 430, -100, 92, 11, 0.35],
  ], deepFill, 1.8);

  /* ---------- Hanging vines (pivot at their anchor) ---------- */
  const vineSpecs = [
    { x: 92, len: 112, sway: 'a' }, { x: 138, len: 74, sway: 'b' }, { x: 196, len: 44, sway: 'a' },
    { x: 788, len: 104, sway: 'b' }, { x: 742, len: 66, sway: 'a' }, { x: 690, len: 40, sway: 'b' },
  ];
  const vines = vineSpecs.map((v, i) => {
    const bend = (i % 2 ? -1 : 1) * (6 + rand() * 6);
    const leaves = [0.35, 0.6, 0.82].map((t, k) => {
      const ly = r1(v.len * t);
      const lx = r1(bend * Math.sin(Math.PI * t));
      const s = k % 2 ? -1 : 1;
      return `<path d="M ${lx} ${ly} q ${s * 6} -4 ${s * 9} 1 q ${s * -4} 4 ${s * -9} -1 Z" fill="${nearFill}" />`;
    }).join('');
    return `<g transform="translate(${v.x}, 0)"><g class="vine vine-${v.sway}" style="animation-delay:-${r1(rand() * 6)}s">
      <path d="M 0 -5 Q ${r1(bend * 2)} ${r1(v.len / 2)} 0 ${v.len}" fill="none" stroke="${nearFill}" stroke-width="1.6" stroke-linecap="round" />
      ${leaves}
      <circle cx="0" cy="${v.len + 2}" r="7" fill="url(#bud-glow)" />
      <circle cx="0" cy="${v.len + 2}" r="1.7" fill="${theme.floraGlow}" />
    </g></g>`;
  }).join('');

  /* ---------- Mushrooms ---------- */
  const shroom = (x, y, s, flip = 1) => `
    <g transform="translate(${x}, ${y}) scale(${s * flip}, ${s})">
      <ellipse cx="0" cy="0" rx="34" ry="7" fill="url(#pool-glow)" />
      <path d="M -1.6 0 Q -1 -10 0 -14 Q 1 -10 1.6 0 Z" fill="${theme.mushroomStem}" />
      <path d="M -10 -13 C -10 -22 10 -22 10 -13 C 6 -11.5 -6 -11.5 -10 -13 Z" fill="${theme.mushroomCap}" />
      <path d="M -8 -15 C -6 -19 4 -20 7 -16" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.5" />
      <path d="M 8 0 Q 9 -5 10 -8" fill="none" stroke="${theme.mushroomStem}" stroke-width="1.4" stroke-linecap="round" />
      <path d="M 5.5 -7.5 C 5.5 -12 14.5 -12 14.5 -7.5 Z" fill="${theme.mushroomCap}" opacity="0.9" />
    </g>`;
  const mushrooms = shroom(54, 382, 1.3) + shroom(826, 380, 1.4, -1);

  /* ---------- Fireflies ---------- */
  let fireflies = '';
  for (let i = 0; i < 18; i++) {
    const x = r1(40 + rand() * (W - 80));
    const y = r1(96 + rand() * 270);
    const dur = r1(5 + rand() * 6);
    fireflies += `<g class="ff ff-${i % 3}" style="animation-duration:${dur}s;animation-delay:-${r1(rand() * dur)}s">
      <circle cx="${x}" cy="${y}" r="7" fill="url(#ff-glow)" />
      <circle cx="${x}" cy="${y}" r="1.1" fill="#ffffff" />
    </g>`;
  }

  /* ---------- Falling leaves ---------- */
  const leafFill = mix(midFill, theme.floraGlow, 0.18);
  let leaves = '';
  for (let i = 0; i < 4; i++) {
    const x = r1(120 + rand() * (W - 240));
    const dur = r1(18 + rand() * 10);
    leaves += `<g transform="translate(${x}, -16)"><g class="leaf" style="animation-duration:${dur}s;animation-delay:-${r1(rand() * dur)}s">
      <path d="M 0 -5 C 4 -3 4 3 0 5 C -4 3 -4 -3 0 -5 Z M 0 -5 L 0 5" fill="${leafFill}" stroke="${leafFill}" stroke-width="0.4" /></g></g>`;
  }

  const puff = (cx, cy, rx, ry, op) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#puff)" opacity="${op}" />`;

  /* ---------- Spirits ---------- */
  const s0 = crowdScale(repos.length);
  const band = roamBand(s0);
  // Crowds: caption the 12 strongest spirits; the rest keep hover titles
  const captioned = new Set(repos.map((r, i) => [r.commits || 0, i]).sort((a, b) => b[0] - a[0]).slice(0, interactive ? 0 : 10).map(x => x[1]));
  // Opening frame: spirits start from evenly spread, staggered slots, then wander off
  const rows = repos.length <= 5 ? 1 : repos.length <= 16 ? 2 : 3;
  const perRow = Math.ceil(repos.length / rows);
  const slots = repos.map((_, i) => {
    const row = i % rows;
    const col = Math.floor(i / rows);
    const step = (W - 160) / perRow;
    const x = 80 + step * (col + 0.5) + (row % 2 ? step * 0.35 : -step * 0.15) + (rand() - 0.5) * step * 0.2;
    const y = rows === 1 ? (band.yTop + band.yBot) / 2 : band.yTop + (band.yBot - band.yTop) * (row / (rows - 1));
    return [Math.max(70, Math.min(W - 70, x)), y];
  });
  const placed = repos.map((repo, i) => {
    const tier = TIERS.slice().reverse().find(t => Math.max(1, repo.commits || 1) >= t.min) || TIERS[0];
    const route = wanderRoute(rand, s0, tier.tier, band.yTop, band.yBot, slots[i]);
    return { repo, i, route };
  });
  // Static depth order: farther (higher) spirits first
  placed.sort((a, b) => a.route.y - b.route.y);
  const ghosts = placed.map(({ repo, i, route }) => renderGhost(repo, i, route.x, route.y, theme, {
    scale: route.scale,
    roam: interactive ? null : route.roam,
    caption: interactive || captioned.has(i) ? 'full' : false,
  })).join('');

  /* ---------- HUD ---------- */
  const DX = W - 56;     // rank dial center
  const DY = 44;
  const DR = 21;
  const circ = 2 * Math.PI * DR;
  const arc = Math.max(0.04, Math.min(1, rank.score));
  const commitsLabel = `${userData.commitsExact === false ? '~' : ''}${fmt(totalCommits)}`;

  const rankTitleX = DX - DR - 14;
  const titleW = Math.max(textWidth(rank.title, 12.5), rank.topLabel.length * 7.5 * 0.72 + (rank.topLabel.length - 1) * 1.6);
  const stats = [
    { label: 'FOLLOWERS', value: fmt(followers) },
    { label: 'STARS', value: fmt(totalStars) },
    { label: 'COMMITS', value: commitsLabel },
    { label: 'SPIRITS', value: fmt(totalRepos) },
  ];
  let sx = rankTitleX - titleW - 28;
  const statEls = stats.map(s => {
    const w = Math.max(textWidth(s.value, 15), s.label.length * 7.5 * 0.72 + (s.label.length - 1) * 1.6);
    const el = `
      <text x="${r1(sx)}" y="36" text-anchor="end" class="t-label">${s.label}</text>
      <text x="${r1(sx)}" y="56" text-anchor="end" class="t-stat">${escapeXml(s.value)}</text>
      <line x1="${r1(sx + 14)}" y1="28" x2="${r1(sx + 14)}" y2="57" stroke="${theme.textColor}" stroke-opacity="0.14" />`;
    sx -= w + 28;
    return el;
  }).join('');

  const displayName = username.length > 20 ? username.slice(0, 19) + '…' : username;
  const desc = repos.map(r => `${r.name} (${r.commits} commits)`).join(', ');
  const shown = repos.length < totalRepos ? ` Showing ${repos.length} of ${totalRepos}.` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${outW}" height="${outH}" preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby="gj-title gj-desc">
  <title id="gj-title">${escapeXml(username)}'s Ghost Jungle</title>
  <desc id="gj-desc">${escapeXml(`${totalRepos} repository spirits: ${desc}.${shown} ${fmt(totalCommits)} commits, ${fmt(totalStars)} stars, ${fmt(followers)} followers. Canopy rank ${rank.grade} ${rank.title}, ${rank.topLabel.toLowerCase()}.`)}</desc>
  <defs>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="18" /></clipPath>

    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${mix(sky0, '#000000', 0.3)}" />
      <stop offset="40%" stop-color="${sky1}" />
      <stop offset="64%" stop-color="${mix(sky1, theme.mistColor, 0.35)}" />
      <stop offset="100%" stop-color="${sky2}" />
    </linearGradient>
    <radialGradient id="moon-halo">
      <stop offset="0%" stop-color="${moon}" stop-opacity="0.38" />
      <stop offset="12%" stop-color="${moon}" stop-opacity="0.2" />
      <stop offset="35%" stop-color="${moon}" stop-opacity="0.07" />
      <stop offset="100%" stop-color="${moon}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="moon-disc" cx="40%" cy="36%" r="68%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="55%" stop-color="${mix('#ffffff', moon, 0.28)}" />
      <stop offset="100%" stop-color="${mix(moon, sky1, 0.2)}" />
    </radialGradient>
    <radialGradient id="moon-wash" cx="50%" cy="0%" r="90%">
      <stop offset="0%" stop-color="${moon}" stop-opacity="0.16" />
      <stop offset="100%" stop-color="${moon}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="shaft-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${mix(moon, '#ffffff', 0.4)}" stop-opacity="0.2" />
      <stop offset="45%" stop-color="${moon}" stop-opacity="0.07" />
      <stop offset="100%" stop-color="${moon}" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="cloud-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${mix(cloudFill, moon, 0.35)}" />
      <stop offset="60%" stop-color="${cloudFill}" />
    </linearGradient>
    <linearGradient id="haze-band" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${haze}" stop-opacity="0" />
      <stop offset="50%" stop-color="${haze}" stop-opacity="0.45" />
      <stop offset="100%" stop-color="${haze}" stop-opacity="0" />
    </linearGradient>
    <radialGradient id="puff">
      <stop offset="0%" stop-color="${haze}" stop-opacity="0.55" />
      <stop offset="100%" stop-color="${haze}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="ff-glow">
      <stop offset="0%" stop-color="${theme.fireflyColor}" stop-opacity="0.9" />
      <stop offset="35%" stop-color="${theme.fireflyColor}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${theme.fireflyColor}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="bud-glow">
      <stop offset="0%" stop-color="${theme.floraGlow}" stop-opacity="0.75" />
      <stop offset="100%" stop-color="${theme.floraGlow}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="pool-glow">
      <stop offset="0%" stop-color="${theme.mushroomCap}" stop-opacity="0.55" />
      <stop offset="100%" stop-color="${theme.mushroomCap}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="46%" r="72%">
      <stop offset="52%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.78" />
    </radialGradient>
    <linearGradient id="letterbox" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.66" />
      <stop offset="19%" stop-color="#000000" stop-opacity="0" />
      <stop offset="86%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.7" />
    </linearGradient>
${SHARED_DEFS}
    <linearGradient id="streak" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.95" />
    </linearGradient>
    <filter id="volumetric" x="-30%" y="-10%" width="160%" height="120%">
      <feGaussianBlur stdDeviation="11" />
    </filter>
    <filter id="soften" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur stdDeviation="3" />
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0" />
    </filter>
  </defs>

  <style>
    ${FONT_FACES}
    text { font-family: ${FONT}; }
    .t-name    { font-size: 11px; font-weight: 500; fill: ${theme.textColor}; paint-order: stroke; stroke: ${deepFill}; stroke-width: 3px; stroke-linejoin: round; }
    .t-meta    { font-size: 8px; font-weight: 700; letter-spacing: 1px; paint-order: stroke; stroke: ${deepFill}; stroke-width: 2.5px; stroke-linejoin: round; }
    .t-eyebrow { font-size: 8px; font-weight: 700; letter-spacing: 3px; fill: ${theme.textDim}; }
    .t-title   { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; fill: ${theme.textColor}; }
    .t-label   { font-size: 7.5px; font-weight: 700; letter-spacing: 1.6px; fill: ${theme.textDim}; opacity: 0.85; }
    .t-stat    { font-size: 15px; font-weight: 500; fill: ${theme.textColor}; font-variant-numeric: tabular-nums; }
    .t-rank    { font-size: 12.5px; font-weight: 700; }
    .t-grade   { font-size: 14px; font-weight: 700; letter-spacing: -0.4px; }
    .t-mark    { font-size: 7.5px; font-weight: 500; letter-spacing: 0.6px; fill: #ffffff; opacity: 0.16; }
${GHOST_CSS}
    @keyframes cam-far  { 0%,100% { transform: translateX(-5px) } 50% { transform: translateX(5px) } }
    @keyframes cam-mid  { 0%,100% { transform: translateX(-3px) } 50% { transform: translateX(3px) } }
    @keyframes cam-near { 0%,100% { transform: translateX(8px) } 50% { transform: translateX(-8px) } }
    @keyframes cam-top  { 0%,100% { transform: translateX(12px) } 50% { transform: translateX(-12px) } }
    @keyframes star     { 0%,90% { opacity: 0; transform: translate(0,0) } 91% { opacity: 1 } 96%,100% { opacity: 0; transform: translate(-220px,88px) } }
    @keyframes leaf     { 0% { opacity: 0; transform: translate(0,0) rotate(0deg) } 8% { opacity: .9 } 25% { transform: translate(18px,105px) rotate(140deg) } 50% { transform: translate(-14px,210px) rotate(260deg) } 75% { transform: translate(16px,315px) rotate(400deg) } 92% { opacity: .8 } 100% { opacity: 0; transform: translate(-6px,430px) rotate(520deg) } }
    @keyframes twinkle  { 0%,100% { opacity: .9 } 50% { opacity: .15 } }
    @keyframes shaft    { 0%,100% { opacity: .55 } 40% { opacity: 1 } 70% { opacity: .7 } }
    @keyframes moonlight{ 0%,100% { opacity: 1 } 45% { opacity: .82 } 55% { opacity: .78 } }
    @keyframes cloud-a  { 0% { transform: translateX(-260px) } 100% { transform: translateX(260px) } }
    @keyframes cloud-b  { 0% { transform: translateX(240px) } 100% { transform: translateX(-240px) } }
    @keyframes drift-l  { 0%,100% { transform: translateX(0) } 50% { transform: translateX(-60px) } }
    @keyframes drift-r  { 0%,100% { transform: translateX(0) } 50% { transform: translateX(60px) } }
    @keyframes sway-a   { 0%,100% { transform: rotate(-1.6deg) } 50% { transform: rotate(1.8deg) } }
    @keyframes sway-b   { 0%,100% { transform: rotate(1.4deg) } 50% { transform: rotate(-1.8deg) } }
    @keyframes ff-0     { 0%,100% { transform: translate(0,0); opacity: 0 } 20%,80% { opacity: 1 } 50% { transform: translate(18px,-22px) } }
    @keyframes ff-1     { 0%,100% { transform: translate(0,0); opacity: 0 } 25%,75% { opacity: .9 } 50% { transform: translate(-20px,-14px) } }
    @keyframes ff-2     { 0%,100% { transform: translate(0,0); opacity: 0 } 30%,70% { opacity: 1 } 50% { transform: translate(10px,-28px) } }
    @keyframes dial     { from { stroke-dashoffset: ${r1(circ)} } }

    .cam-far { animation: cam-far 26s ease-in-out infinite } .cam-mid { animation: cam-mid 26s ease-in-out infinite }
    .cam-near { animation: cam-near 26s ease-in-out infinite } .cam-top { animation: cam-top 26s ease-in-out infinite }
    .shooting { animation: star 13s linear infinite; opacity: 0 }
    .leaf { animation: leaf 22s linear infinite; opacity: 0 }
    .twinkle { animation: twinkle 4.5s ease-in-out infinite }
    .shaft { animation: shaft 11s ease-in-out infinite } .shaft-1 { animation-delay: -4s } .shaft-2 { animation-delay: -7.5s }
    .moonlight { animation: moonlight 34s ease-in-out infinite }
    .cloud-a { animation: cloud-a 70s linear infinite } .cloud-b { animation: cloud-b 95s linear infinite }
    .drift-l { animation: drift-l 22s ease-in-out infinite } .drift-r { animation: drift-r 28s ease-in-out infinite }
    .vine-a { animation: sway-a 7s ease-in-out infinite } .vine-b { animation: sway-b 8.5s ease-in-out infinite }
    .ff-0 { animation-name: ff-0 } .ff-1 { animation-name: ff-1 } .ff-2 { animation-name: ff-2 }
    .ff { animation-timing-function: ease-in-out; animation-iteration-count: infinite; opacity: 0 }
    .ghost { cursor: pointer }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important } .ff { opacity: .8 } }
  </style>

  <g clip-path="url(#frame)">
    <!-- SKY -->
    <rect width="${W}" height="${H}" fill="url(#sky)" />
    <g>${stars}</g>
    <g transform="translate(${r1(560 + rand() * 200)}, ${r1(26 + rand() * 36)}) rotate(-22)">
      <g class="shooting" style="animation-delay:-${r1(rand() * 6)}s"><rect x="-70" y="-0.6" width="70" height="1.2" rx="0.6" fill="url(#streak)" /></g>
    </g>

    <!-- MOON -->
    <g class="moonlight">
      <rect width="${W}" height="${H}" fill="url(#moon-wash)" />
      <circle cx="${MX}" cy="${MY}" r="240" fill="url(#moon-halo)" />
      <circle cx="${MX}" cy="${MY}" r="33" fill="url(#moon-disc)" />
      <g fill="${mix(moon, sky1, 0.55)}">
        <circle cx="${MX + 9}" cy="${MY - 8}" r="5.5" opacity="0.2" />
        <circle cx="${MX - 10}" cy="${MY + 6}" r="8" opacity="0.16" />
        <circle cx="${MX + 6}" cy="${MY + 14}" r="4" opacity="0.14" />
        <circle cx="${MX - 4}" cy="${MY - 14}" r="3" opacity="0.12" />
      </g>
    </g>

    <!-- CLOUDS crossing the moon -->
    <g filter="url(#soften)">
      <g class="cloud-a" style="animation-delay:-${r1(rand() * 40)}s">
        <path d="${cloudPath(MX, MY + 12, 190, 14, rand)}" fill="url(#cloud-grad)" opacity="0.85" />
      </g>
      <g class="cloud-b" style="animation-delay:-${r1(rand() * 60)}s">
        <path d="${cloudPath(MX, MY - 18, 150, 10, rand)}" fill="url(#cloud-grad)" opacity="0.6" />
      </g>
    </g>

    <!-- VOLUMETRIC MOONLIGHT -->
    <g filter="url(#volumetric)" style="mix-blend-mode:screen">${shafts}</g>

    <!-- FAR RIDGE -->
    <g class="cam-far">
      <path d="${farRidge}" fill="${farFill}" />
      <g>${frondGroup(farPalms, farFill, 1.2)}</g>
      <rect x="-20" y="196" width="${W + 40}" height="110" fill="url(#haze-band)" />
      <g class="drift-l">
        ${puff(200, 256, 230, 22, 0.9)}
        ${puff(690, 266, 260, 20, 0.8)}
      </g>
    </g>

    <!-- MID CANOPY -->
    <g class="cam-mid">
      <path d="${midRidge}" fill="${midFill}" />
      ${trunks}
      <rect x="-20" y="292" width="${W + 40}" height="76" fill="url(#haze-band)" opacity="0.55" />
    </g>

    <!-- FIREFLIES -->
    <g style="mix-blend-mode:screen">${fireflies}</g>

    <!-- SPIRITS -->
    <g id="ghost-sanctuary" data-s0="${r3(s0)}" data-ytop="${r1(band.yTop)}" data-ybot="${r1(band.yBot)}">${ghosts}
    </g>

    <!-- FOREST FLOOR -->
    <g class="cam-near">
      <path d="${groundLine}" fill="${deepFill}" />
      ${mushrooms}
      <g>${ferns}</g>
      <g class="drift-r">
        ${puff(160, 378, 260, 26, 0.75)}
        ${puff(640, 384, 300, 24, 0.7)}
      </g>
    </g>

    <!-- FALLING LEAVES -->
    <g>${leaves}</g>

    <!-- OVERHEAD CANOPY -->
    <g class="cam-top">
      <g>${overheadFar}</g>
      <g>${vines}</g>
      <g>${overheadNear}</g>
    </g>

    <!-- COLOR GRADE -->
    <rect width="${W}" height="${H}" fill="url(#vignette)" />
    <rect width="${W}" height="${H}" fill="url(#letterbox)" />
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.045" />

    <!-- HUD -->
    <g transform="translate(34, 0)">
      <text x="0" y="36" class="t-eyebrow">THE GHOST JUNGLE</text>
      <text x="0" y="60" class="t-title">${escapeXml(displayName)}</text>
    </g>
    <g>${statEls}</g>

    <!-- RANK -->
    <g>
      <text x="${r1(rankTitleX)}" y="40" text-anchor="end" class="t-rank" fill="${rank.color}">${escapeXml(rank.title)}</text>
      <text x="${r1(rankTitleX)}" y="55" text-anchor="end" class="t-label">${rank.topLabel}</text>
      <g transform="translate(${DX}, ${DY})">
        <circle r="${DR + 6}" fill="${rank.color}" opacity="0.08" />
        <circle r="${DR}" fill="none" stroke="${theme.textColor}" stroke-opacity="0.12" stroke-width="2.5" />
        <circle r="${DR}" fill="none" stroke="${rank.color}" stroke-width="2.5" stroke-linecap="round"
                stroke-dasharray="${r1(circ * arc)} ${r1(circ)}" transform="rotate(-90)" filter="url(#core-glow)"
                style="animation: dial 2.4s cubic-bezier(.16,1,.3,1) both" />
        <text x="0" y="5" text-anchor="middle" class="t-grade" fill="${rank.color}">${rank.grade}</text>
      </g>
    </g>

    <!-- CREDIT -->
    <text x="${W - 16}" y="${H - 11}" text-anchor="end" class="t-mark">@AtlasRoX</text>
  </g>

  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="17.5" fill="none" stroke="${theme.textColor}" stroke-opacity="0.12" />
</svg>`;
}

/**
 * A single transparent ghost portrait (used by the playground and wiki).
 */
function renderGhostPortrait(tierNumber, options = {}) {
  const tier = TIERS[Math.min(Math.max(parseInt(tierNumber, 10) || 1, 1), 5) - 1];
  const theme = getTheme(options.theme || 'midnight');
  const repo = { name: tier.title, language: options.language || 'TypeScript', commits: Math.max(tier.min, 1), stars: 0 };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-75 -78 150 150" width="150" height="150" role="img" aria-label="${tier.title}">
  <defs>${SHARED_DEFS}
  </defs>
  <style>${GHOST_CSS}
    @media (prefers-reduced-motion: reduce) { * { animation: none !important } }
  </style>
  ${renderGhost(repo, tier.tier - 1, 0, 0, theme, { caption: false, link: false })}
</svg>`;
}

module.exports = {
  renderJungleSvg,
  renderGhostPortrait,
  SVG_MAX_SPIRITS,
  INTERACTIVE_MAX_SPIRITS,
  W,
  H
};
