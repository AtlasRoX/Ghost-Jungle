/**
 * Ghost Jungle - Spirit characters
 *
 * One evolving lineage of jungle spirits. Commits set the life stage,
 * the repository language colors the soul light.
 *
 *   I   Wisp     round newborn light, big curious eyes
 *   II  Specter  grows sleeves of mist that wave with follow-through
 *   III Phantom  draws a hood of shadow; only glowing eyes remain
 *   IV  Wraith   tattered cloak, carries a swinging lantern holding its soul
 *   V   Titan    forest deity with living antlers and a court of orbiting wisps
 *
 * Motion design
 *   - Cloth: every hem and sleeve is a SMIL path morph across 4 phases of one
 *     sine cycle, so fabric ripples continuously and loops seamlessly.
 *   - Body: float + squash/stretch breathing, plus a slower out-of-phase tilt.
 *   - Face: irregular double blinks and small glances (saccades).
 *   - Secondary: ectoplasm motes shed from the hem, lantern pendulum,
 *     flame flicker, soul light pulse, orbiting familiars.
 *   - Roaming: in the scene, all spirits travel one shared orbit (renderer.js).
 *
 * Every pivot sits at a local origin (via translate wrappers) so CSS
 * transforms behave identically in Chrome, Firefox and Safari.
 */

const { getLanguageColor, glowSafe, mix } = require('./themes');

const TIERS = [
  { tier: 1, min: 0,   title: 'Lesser Wisp',     short: 'Wisp',    numeral: 'I',   color: '#7dd3fc', float: 4.6 },
  { tier: 2, min: 10,  title: 'Forest Specter',  short: 'Specter', numeral: 'II',  color: '#6ee7b7', float: 4.9 },
  { tier: 3, min: 50,  title: 'Phantom Stalker', short: 'Phantom', numeral: 'III', color: '#c4b5fd', float: 5.3 },
  { tier: 4, min: 200, title: 'Wraith Archon',   short: 'Wraith',  numeral: 'IV',  color: '#f9a8d4', float: 5.8 },
  { tier: 5, min: 500, title: 'Ancient Titan',   short: 'Titan',   numeral: 'V',   color: '#fcd34d', float: 6.4 },
];

/* Per-tier body geometry */
const FORMS = {
  1: { w: 15, top: -19, hem: 16, amp: 2.6, waves: 3, sway: 2.5 },
  2: { w: 17, top: -25, hem: 25, amp: 3.2, waves: 4, sway: 3.5 },
  3: { w: 19, top: -29, hem: 31, amp: 3.6, waves: 4, sway: 4.5 },
  4: { w: 21, top: -32, hem: 37, amp: 4.2, waves: 5, sway: 5.5 },
  5: { w: 24, top: -35, hem: 41, amp: 4.6, waves: 5, sway: 6 },
};

/* Distance from spirit center to its caption baseline (unscaled), per tier */
const CAPTION_GAP = { 1: 30, 2: 38, 3: 44, 4: 56, 5: 56 };

function getGhostTier(commits) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (commits >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Rough text width for the system sans stack (px) */
function textWidth(str, size, spacing = 0) {
  return str.length * size * 0.56 + Math.max(0, str.length - 1) * spacing;
}

const n = v => Math.round(v * 10) / 10;
const PHASES = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

/** SMIL morph across the 4 phases, eased, looping back to the first frame */
function morph(frames, dur, begin) {
  const values = [...frames, frames[0]].join(';');
  return `<animate attributeName="d" dur="${dur}s" begin="-${begin}s" repeatCount="indefinite" calcMode="spline"
      keyTimes="0;0.25;0.5;0.75;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1" values="${values}" />`;
}

/* ------------------------------------------------------------------ */
/* Cloth generators (identical command structure across phases)        */
/* ------------------------------------------------------------------ */

/** Sheet body: domed head, soft shoulders, scalloped hem that ripples */
function sheetPath(f, phi) {
  const { w, top, hem, amp, waves, sway } = f;
  const sx = t => sway * Math.sin(phi - t * 1.4) * t * t; // lower cloth lags behind
  let d = `M ${-w} 0 C ${-w} ${n(top * 0.58)} ${n(-w * 0.6)} ${top} 0 ${top} C ${n(w * 0.6)} ${top} ${w} ${n(top * 0.58)} ${w} 0`;
  d += ` C ${n(w + sx(0.5))} ${n(hem * 0.45)} ${n(w * 1.05 + sx(0.8))} ${n(hem * 0.8)} ${n(w * 0.98 + sx(1))} ${hem}`;
  const span = (w * 1.96) / waves;
  for (let i = 0; i < waves; i++) {
    const x0 = w * 0.98 - span * i + sx(1);
    const x1 = x0 - span;
    const lobe = hem + amp * (1.5 + 0.7 * Math.sin(phi + i * 1.9));
    const lift = i === waves - 1 ? hem : hem - amp * (0.5 + 0.35 * Math.sin(phi + (i + 1) * 1.9));
    d += ` Q ${n((x0 + x1) / 2)} ${n(lobe)} ${n(x1)} ${n(lift)}`;
  }
  d += ` C ${n(-w * 1.05 + sx(0.8))} ${n(hem * 0.8)} ${n(-w + sx(0.5))} ${n(hem * 0.45)} ${-w} 0 Z`;
  return d;
}

/** Tapered trailing strand (tattered cloak / ribbon) */
function strandPath(x, y, len, width, bend, phi, lag) {
  const s = t => bend * Math.sin(phi - lag - t * 1.6) * t;
  const p = t => [x + s(t), y + len * t];
  const [x1, y1] = p(0.33);
  const [x2, y2] = p(0.66);
  const [x3, y3] = p(1);
  return `M ${n(x - width)} ${y} C ${n(x1 - width * 0.8)} ${n(y1)} ${n(x2 - width * 0.4)} ${n(y2)} ${n(x3)} ${n(y3)}`
    + ` C ${n(x2 + width * 0.4)} ${n(y2)} ${n(x1 + width * 0.8)} ${n(y1)} ${n(x + width)} ${y} Z`;
}

/** Sleeve: a soft limb that waves from the shoulder with follow-through */
function sleevePath(side, sx, sy, reach, droop, phi) {
  const wave = Math.sin(phi) * 4;
  const lag = Math.sin(phi - 0.9) * 5;
  const hx = sx + side * reach;
  const hy = sy + droop + wave;
  return `M ${sx} ${n(sy - 6)} C ${n(sx + side * reach * 0.5)} ${n(sy - 7 + wave * 0.4)} ${n(hx - side * 2)} ${n(hy - 5 + lag * 0.3)} ${n(hx)} ${n(hy)}`
    + ` C ${n(hx - side * 1)} ${n(hy + 3)} ${n(hx - side * 5)} ${n(hy + 4 + lag * 0.2)} ${n(hx - side * 7)} ${n(hy + 1)}`
    + ` C ${n(sx + side * reach * 0.45)} ${n(sy + 4 + wave * 0.3)} ${n(sx + side * 2)} ${n(sy + 6)} ${sx} ${n(sy + 8)} Z`;
}

/* ------------------------------------------------------------------ */
/* Faces                                                               */
/* ------------------------------------------------------------------ */

function cuteEyes(c, spread, y, rx, ry) {
  return `
      <g class="look">
        <g class="blink">
          <ellipse cx="${-spread}" cy="${y}" rx="${rx}" ry="${ry}" fill="#0a0f1e" />
          <ellipse cx="${spread}" cy="${y}" rx="${rx}" ry="${ry}" fill="#0a0f1e" />
        </g>
        <circle cx="${n(-spread + rx * 0.35)}" cy="${n(y - ry * 0.4)}" r="${n(rx * 0.42)}" fill="#ffffff" />
        <circle cx="${n(spread + rx * 0.35)}" cy="${n(y - ry * 0.4)}" r="${n(rx * 0.42)}" fill="#ffffff" />
        <circle cx="${n(-spread - rx * 0.3)}" cy="${n(y + ry * 0.45)}" r="${n(rx * 0.2)}" fill="${c}" opacity="0.9" />
        <circle cx="${n(spread - rx * 0.3)}" cy="${n(y + ry * 0.45)}" r="${n(rx * 0.2)}" fill="${c}" opacity="0.9" />
      </g>`;
}

function glowEyes(c, spread, y, len, slant) {
  const eye = s => `<path d="M ${n(s * (spread - len))} ${n(y + slant)} Q ${n(s * spread)} ${n(y - 2.6)} ${n(s * (spread + len))} ${n(y - slant * 0.4)} Q ${n(s * spread)} ${n(y + 1.6)} ${n(s * (spread - len))} ${n(y + slant)} Z" />`;
  return `
      <g class="look">
        <g class="blink" fill="${c}" filter="url(#core-glow)">${eye(-1)}${eye(1)}</g>
        <g class="blink" fill="#ffffff" opacity="0.9">
          <circle cx="${-spread}" cy="${n(y - 0.4)}" r="0.9" /><circle cx="${spread}" cy="${n(y - 0.4)}" r="0.9" />
        </g>
      </g>`;
}

/* ------------------------------------------------------------------ */
/* Character assembly                                                  */
/* ------------------------------------------------------------------ */

function bodyLayers(id, f, dur, begin) {
  const frames = PHASES.map(p => sheetPath(f, p));
  return {
    def: `<path id="body-${id}" d="${frames[0]}">${morph(frames, dur, begin)}</path>
      <clipPath id="clip-${id}"><use href="#body-${id}" /></clipPath>`,
    draw: `
      <use href="#body-${id}" fill="url(#gb-${id})" filter="url(#ghost-soft)" />
      <g clip-path="url(#clip-${id})">
        <ellipse class="soul" cx="0" cy="${n(f.top * 0.1 + 4)}" rx="${n(f.w * 0.9)}" ry="${n(f.w * 0.95)}" fill="url(#soul-${id})" />
        <ellipse cx="${n(-f.w * 0.75)}" cy="${n(f.hem * 0.6)}" rx="${n(f.w * 0.9)}" ry="${n(f.hem * 0.9)}" fill="url(#shade)" />
      </g>
      <use href="#body-${id}" fill="none" stroke="url(#rim)" stroke-width="1.1" />`,
  };
}

function hood(id, f, c, deep) {
  const { w, top } = f;
  const tipX = n(w * 0.55);
  return `
      <path d="M ${n(-w - 2.5)} 4 C ${n(-w - 3)} ${n(top * 0.6)} ${n(-w * 0.55)} ${n(top - 3)} ${tipX} ${n(top - 7)}
               C ${n(w * 0.5)} ${n(top - 2)} ${n(w + 3)} ${n(top * 0.55)} ${n(w + 2.5)} 4
               C ${n(w * 0.55)} 8 ${n(-w * 0.55)} 8 ${n(-w - 2.5)} 4 Z"
            fill="url(#hood-${id})" />
      <path d="M ${tipX} ${n(top - 7)} C ${n(w * 0.5)} ${n(top - 2)} ${n(w + 3)} ${n(top * 0.55)} ${n(w + 2.5)} 4"
            fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="0.9" stroke-linecap="round" />
      <path d="M ${n(-w * 0.52)} -4 C ${n(-w * 0.56)} ${n(top * 0.55)} ${n(w * 0.56)} ${n(top * 0.55)} ${n(w * 0.52)} -4
               C ${n(w * 0.3)} 0 ${n(-w * 0.3)} 0 ${n(-w * 0.52)} -4 Z" fill="${deep}" />
      <path d="M ${n(-w * 0.52)} -4 C ${n(-w * 0.56)} ${n(top * 0.55)} ${n(w * 0.56)} ${n(top * 0.55)} ${n(w * 0.52)} -4"
            fill="none" stroke="${c}" stroke-opacity="0.35" stroke-width="0.8" />`;
}

function renderWisp(c, id, f, dur, begin) {
  const body = bodyLayers(id, f, dur, begin);
  return {
    defs: body.def,
    art: `${body.draw}
      ${cuteEyes(c, 5.4, -5, 2.5, 3.4)}
      <ellipse cx="-9.6" cy="0.2" rx="2.2" ry="1.2" fill="${c}" opacity="0.45" />
      <ellipse cx="9.6" cy="0.2" rx="2.2" ry="1.2" fill="${c}" opacity="0.45" />
      <path d="M -1.6 1.6 Q 0 3.2 1.6 1.6" fill="none" stroke="#0a0f1e" stroke-width="1" stroke-linecap="round" />`,
  };
}

function renderSpecter(c, id, f, dur, begin) {
  const body = bodyLayers(id, f, dur, begin);
  const sleeve = side => {
    const frames = PHASES.map(p => sleevePath(side, side * (f.w - 2), 4, 13, 2, p + (side > 0 ? 0.6 : 0)));
    return `<path d="${frames[0]}" fill="url(#gb-${id})" opacity="0.92">${morph(frames, n(dur * 0.75), begin)}</path>`;
  };
  return {
    defs: body.def,
    art: `${sleeve(-1)}${sleeve(1)}${body.draw}
      ${cuteEyes(c, 6.2, -8, 2.3, 3.1)}
      <path d="M -2 -1 Q 0 1 2 -1" fill="none" stroke="#0a0f1e" stroke-width="1" stroke-linecap="round" />`,
  };
}

function renderPhantom(c, id, f, dur, begin) {
  const body = bodyLayers(id, f, dur, begin);
  const deep = '#04060c';
  const sleeve = side => {
    const frames = PHASES.map(p => sleevePath(side, side * (f.w - 2), 6, 12, 6, p + (side > 0 ? 0.8 : 0)));
    return `<path d="${frames[0]}" fill="url(#gb-${id})" opacity="0.85">${morph(frames, n(dur * 0.8), begin)}</path>`;
  };
  return {
    defs: body.def,
    art: `${sleeve(-1)}${sleeve(1)}${body.draw}
      ${hood(id, f, c, deep)}
      ${glowEyes(c, 4.4, -11, 3, 1.1)}`,
  };
}

function strands(id, f, count, len, dur, begin) {
  const span = f.w * 1.5;
  return Array.from({ length: count }, (_, i) => {
    const x = n(-span / 2 + (span / (count - 1)) * i);
    const L = len * (0.75 + 0.25 * Math.sin(i * 2.3 + 1));
    const frames = PHASES.map(p => strandPath(x, f.hem - 8, L, 2.2, 9, p, i * 0.9));
    return `<path d="${frames[0]}" fill="url(#gs-${id})">${morph(frames, dur, n(begin + i * 0.3))}</path>`;
  }).join('');
}

function lantern(c, hx, hy) {
  return `
      <g transform="translate(${hx}, ${hy})">
        <g class="pendulum">
          <circle cx="0" cy="17" r="20" fill="url(#lamp-glow)" class="flicker-soft" />
          <line x1="0" y1="0" x2="0" y2="9" stroke="#cbd5e1" stroke-opacity="0.7" stroke-width="0.8" />
          <path d="M -4 9 L 4 9 L 5.5 12 L 5.5 22 L 4 25 L -4 25 L -5.5 22 L -5.5 12 Z" fill="#0b1020" fill-opacity="0.55" stroke="#e2e8f0" stroke-opacity="0.75" stroke-width="0.9" />
          <path d="M -5.5 12 H 5.5 M -5.5 22 H 5.5 M 0 9 V 25" stroke="#e2e8f0" stroke-opacity="0.35" stroke-width="0.6" />
          <g transform="translate(0, 22)">
            <path class="flame" d="M 0 -9 C 3.4 -5, 3.4 -1.4, 0 0 C -3.4 -1.4, -3.4 -5, 0 -9 Z" fill="${c}" filter="url(#core-glow)" />
            <path class="flame" d="M 0 -5.6 C 1.6 -3.2, 1.6 -1, 0 0 C -1.6 -1, -1.6 -3.2, 0 -5.6 Z" fill="#ffffff" />
          </g>
          <path d="M -2.4 9 Q 0 5.6 2.4 9" fill="none" stroke="#e2e8f0" stroke-opacity="0.75" stroke-width="0.9" />
        </g>
      </g>`;
}

function renderWraith(c, id, f, dur, begin) {
  const body = bodyLayers(id, f, dur, begin);
  const deep = '#03050a';
  const armFrames = PHASES.map(p => sleevePath(1, f.w - 2, 5, 13, 1, p * 0.6 + 0.4));
  const leftFrames = PHASES.map(p => sleevePath(-1, -(f.w - 2), 6, 10, 9, p));
  return {
    defs: body.def,
    art: `${strands(id, f, 4, 22, n(dur * 0.9), begin)}
      <path d="${leftFrames[0]}" fill="url(#gb-${id})" opacity="0.8">${morph(leftFrames, n(dur * 0.85), begin)}</path>
      ${body.draw}
      ${hood(id, f, c, deep)}
      ${glowEyes(c, 4.8, -12, 3.2, 1.4)}
      <path d="${armFrames[0]}" fill="url(#gb-${id})">${morph(armFrames, n(dur * 1.2), begin)}</path>
      ${lantern(c, f.w + 10, 7)}`,
  };
}

function antler(side) {
  const s = side;
  return `<path d="M ${s * 8} -30 C ${s * 12} -40 ${s * 14} -46 ${s * 22} -54
                   M ${s * 12} -40 C ${s * 18} -42 ${s * 22} -40 ${s * 26} -44
                   M ${s * 17} -48 C ${s * 16} -54 ${s * 14} -57 ${s * 13} -61
                   M ${s * 20} -42 C ${s * 26} -46 ${s * 31} -46 ${s * 34} -51
                   M ${s * 28} -45 C ${s * 29} -50 ${s * 28} -54 ${s * 30} -57" />`;
}

function renderTitan(c, id, f, dur, begin) {
  const body = bodyLayers(id, f, dur, begin);
  const sleeve = side => {
    const frames = PHASES.map(p => sleevePath(side, side * (f.w - 2), 6, 16, 10, p + (side > 0 ? 1 : 0)));
    return `<path d="${frames[0]}" fill="url(#gb-${id})" opacity="0.88">${morph(frames, n(dur * 0.9), begin)}</path>`;
  };
  const buds = [[22, -54], [26, -44], [13, -61], [34, -51], [30, -57]]
    .flatMap(([x, y]) => [[x, y], [-x, y]])
    .map(([x, y], i) => `<circle class="bud" style="animation-delay:-${(i * 0.37).toFixed(2)}s" cx="${x}" cy="${y}" r="1.5" fill="#ffffff" />`).join('');
  const orbit = 'M 38 0 A 38 9 0 1 1 -38 0 A 38 9 0 1 1 38 0';
  const motes = [0, 2.2, 4.4].map((b, i) => `
        <circle r="${[2.4, 1.8, 2][i]}" fill="${i === 1 ? '#ffffff' : c}" filter="url(#core-glow)">
          <animateMotion dur="6.6s" begin="-${n(b + begin)}s" repeatCount="indefinite" path="${orbit}" />
        </circle>`).join('');
  return {
    defs: body.def,
    art: `
      <ellipse cx="0" cy="-26" rx="38" ry="9" fill="none" stroke="${c}" stroke-opacity="0.25" stroke-width="0.8" />
      ${strands(id, f, 5, 14, n(dur * 0.9), begin)}
      ${sleeve(-1)}${sleeve(1)}
      <g class="antlers" fill="none" stroke="url(#antler-${id})" stroke-width="2.2" stroke-linecap="round" filter="url(#core-glow)">${antler(-1)}${antler(1)}</g>
      ${buds}
      ${body.draw}
      <path d="M 0 -27 L 2.6 -22.5 L 0 -18 L -2.6 -22.5 Z" fill="${c}" filter="url(#core-glow)" />
      ${glowEyes('#fff7d6', 7, -11, 4.2, 0.8)}
      <g transform="translate(0, -26)">${motes}</g>`,
  };
}

const ART = { 1: renderWisp, 2: renderSpecter, 3: renderPhantom, 4: renderWraith, 5: renderTitan };

/* ------------------------------------------------------------------ */
/* Shared defs + CSS (used by the scene and by standalone portraits)    */
/* ------------------------------------------------------------------ */

const SHARED_DEFS = `
    <filter id="ghost-soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1.8" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="core-glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="2.2" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <linearGradient id="rim" x1="1" y1="0" x2="0.2" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="35%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
    <radialGradient id="shade">
      <stop offset="0%" stop-color="#0b1020" stop-opacity="0.28" />
      <stop offset="100%" stop-color="#0b1020" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="lamp-glow">
      <stop offset="0%" stop-color="#fff7d6" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#fff7d6" stop-opacity="0" />
    </radialGradient>`;

const GHOST_CSS = `
    @keyframes float    { 0%,100% { transform: translate(0,0) scale(1.025,.975) } 50% { transform: translate(0,-9px) scale(.98,1.025) } }
    @keyframes tilt     { 0%,100% { transform: rotate(-2.2deg) } 50% { transform: rotate(2.2deg) } }
    @keyframes blink    { 0%,44%,48%,52%,86%,90%,100% { transform: scaleY(1) } 46%,50%,88% { transform: scaleY(.08) } }
    @keyframes look     { 0%,30%,100% { transform: translate(0,0) } 36%,58% { transform: translate(-1.6px,.3px) } 64%,84% { transform: translate(1.4px,-.2px) } }
    @keyframes soul     { 0%,100% { opacity: .7 } 50% { opacity: 1 } }
    @keyframes ecto     { 0% { opacity: 0; transform: translate(0,0) scale(1) } 15% { opacity: .9 } 100% { opacity: 0; transform: translate(var(--dx),-34px) scale(.2) } }
    @keyframes pendulum { 0%,100% { transform: rotate(9deg) } 50% { transform: rotate(-7deg) } }
    @keyframes flame    { 0%,100% { transform: scale(1,1) } 20% { transform: scale(.9,1.12) } 45% { transform: scale(1.06,.94) } 70% { transform: scale(.94,1.08) } }
    @keyframes flicker  { 0%,100% { opacity: .85 } 30% { opacity: .6 } 55% { opacity: 1 } 80% { opacity: .7 } }
    @keyframes bud      { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
    @keyframes antlers  { 0%,100% { opacity: .75 } 50% { opacity: 1 } }

    .float    { animation: float 5s ease-in-out infinite }
    .tilt     { animation: tilt 7s ease-in-out infinite }
    .blink    { transform-box: fill-box; transform-origin: center; animation: blink 7s linear infinite }
    .look     { animation: look 9s ease-in-out infinite }
    .soul     { animation: soul 3.2s ease-in-out infinite }
    .ecto     { transform-box: fill-box; transform-origin: center; animation: ecto 3.6s ease-out infinite; opacity: 0 }
    .pendulum { animation: pendulum 3.4s ease-in-out infinite }
    .flame    { transform-box: fill-box; transform-origin: 50% 100%; animation: flame .9s ease-in-out infinite }
    .flicker-soft { animation: flicker 1.3s ease-in-out infinite }
    .bud      { animation: bud 2.8s ease-in-out infinite }
    .antlers  { animation: antlers 4s ease-in-out infinite }`;

/* ------------------------------------------------------------------ */
/* Public renderer                                                     */
/* ------------------------------------------------------------------ */

/**
 * Full SVG group for one repository spirit.
 *
 * opts.roam (optional) makes the spirit wander along its own route:
 *   { path, dur, begin, keyTimes, keyPoints, keySplines, scales, opacities, opacity0 }
 * `path` is relative to the spirit's static position, so renderers without
 * SMIL still show a correct still frame. opts.caption: 'full' | 'name' | false.
 */
function renderGhost(repo, index, posX, posY, theme, opts = {}) {
  const { caption = 'full', link = true, scale = 1, roam = null } = opts;
  const commits = Math.max(1, repo.commits || 1);
  const stars = repo.stars || 0;
  const c = glowSafe(repo.languageColor || getLanguageColor(repo.language || 'Unknown'));
  const tier = getGhostTier(commits);
  const f = FORMS[tier.tier];
  const id = `g${index}`;

  const rawName = String(repo.name || 'unknown');
  const name = rawName.length > 16 ? rawName.slice(0, 15) + '…' : rawName;
  const href = escapeXml(repo.url || `https://github.com/${repo.owner}/${rawName}`);

  // Desynchronize spirits so nothing moves in robotic unison
  const begin = n((index * 1.37) % tier.float);
  const clothDur = n(tier.float * 0.62);
  const { defs, art } = ART[tier.tier](c, id, f, clothDur, begin);

  const tint = mix('#ffffff', c, 0.3);
  const meta = `${tier.short.toUpperCase()} · ${commits.toLocaleString('en-US')}${stars > 0 ? ` · ★ ${stars.toLocaleString('en-US')}` : ''}`;

  const motes = [-0.5, 0.1, 0.55].map((t, i) => {
    const dx = (i - 1) * 6 + 2;
    return `<circle class="ecto" cx="${n(t * f.w * 1.6)}" cy="${f.hem}" r="${1.4 + (i % 2) * 0.6}" fill="${tint}"
      style="--dx:${dx}px;animation-delay:-${n(begin + i * 1.2)}s;animation-duration:${n(3.2 + i * 0.7)}s" />`;
  }).join('');

  const timing = `animation-duration:${tier.float}s;animation-delay:-${begin}s`;

  const capY = s => n(CAPTION_GAP[tier.tier] * s + 14);
  const smil = roam ? `begin="-${roam.begin}s" dur="${roam.dur}s" repeatCount="indefinite"` : '';
  const kt = roam ? `keyTimes="${roam.keyTimes.join(';')}" calcMode="spline" keySplines="${roam.keySplines.join(';')}"` : '';
  const anim = {
    motion: roam ? `<animateMotion path="${roam.path}" keyPoints="${roam.keyPoints.join(';')}" ${kt} ${smil} />` : '',
    scale: roam ? `<animateTransform attributeName="transform" type="scale" values="${roam.scales.join(';')}" ${kt} ${smil} />` : '',
    caption: roam ? `<animateTransform attributeName="transform" type="translate" values="${roam.scales.map(v => `0 ${capY(v)}`).join(';')}" ${kt} ${smil} />` : '',
    fade: roam ? `<animate attributeName="opacity" values="${roam.opacities.join(';')}" ${kt} ${smil} />` : '',
  };

  return `
  <defs>
    <linearGradient id="gb-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.97" />
      <stop offset="45%" stop-color="${tint}" stop-opacity="0.9" />
      <stop offset="80%" stop-color="${c}" stop-opacity="0.45" />
      <stop offset="100%" stop-color="${c}" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="gs-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${tint}" stop-opacity="0.5" />
      <stop offset="100%" stop-color="${c}" stop-opacity="0" />
    </linearGradient>
    <radialGradient id="soul-${id}">
      <stop offset="0%" stop-color="${c}" stop-opacity="0.95" />
      <stop offset="45%" stop-color="${c}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${c}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="aura-${id}">
      <stop offset="0%" stop-color="${c}" stop-opacity="${(0.2 + tier.tier * 0.05).toFixed(2)}" />
      <stop offset="100%" stop-color="${c}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="hood-${id}" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="${mix('#475569', c, 0.5)}" stop-opacity="0.95" />
      <stop offset="100%" stop-color="${mix('#0f172a', c, 0.3)}" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="antler-${id}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${tint}" />
      <stop offset="100%" stop-color="${c}" />
    </linearGradient>
    ${defs}
  </defs>
  ${link ? `<a href="${href}" target="_blank" rel="noopener noreferrer">` : ''}
  <g class="ghost" id="ghost-${index}" data-index="${index}" data-x="${posX}" data-y="${posY}" data-scale="${scale}" data-tier="${tier.tier}" transform="translate(${posX}, ${posY})">${anim.motion}
    <title>${escapeXml(rawName)} · ${tier.title} · ${commits.toLocaleString('en-US')} commits${stars ? ` · ${stars.toLocaleString('en-US')} stars` : ''}</title>
   <g class="g-fade" opacity="${roam ? roam.opacity0 : 1}">${anim.fade}
    <g class="g-act">
     <g class="g-scale" transform="scale(${scale})">${anim.scale}
      <ellipse cx="0" cy="54" rx="${n(f.w * 2.2)}" ry="7" fill="url(#aura-${id})" />
      ${motes}
      <g class="float" style="${timing}">
        <g class="tilt" style="animation-duration:${n(tier.float * 1.43)}s;animation-delay:-${begin}s">
          <circle cx="0" cy="0" r="${n(f.w * 3)}" fill="url(#aura-${id})" />
          ${art}
        </g>
      </g>
     </g>
    </g>
    ${caption ? `<g class="caption" data-gap="${CAPTION_GAP[tier.tier]}" transform="translate(0, ${capY(scale)})">${anim.caption}
      <text x="0" y="0" text-anchor="middle" class="t-name">${escapeXml(name)}</text>
      ${caption === 'full' || tier.tier >= 4 ? `<text x="0" y="13" text-anchor="middle" class="t-meta" fill="${tier.color}">${escapeXml(meta)}</text>` : ''}
    </g>` : ''}
   </g>
  </g>
  ${link ? '</a>' : ''}`;
}

module.exports = {
  TIERS,
  getGhostTier,
  renderGhost,
  escapeXml,
  textWidth,
  SHARED_DEFS,
  GHOST_CSS
};
