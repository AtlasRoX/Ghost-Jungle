/**
 * Ghost Jungle - social card & icon builder
 *
 *   node scripts/build-og.js
 *
 * Renders the real scene into 1200×630 Open Graph / Twitter cards and the
 * app icons, using a local Chrome/Chromium in headless mode.
 * Set CHROME_PATH if Chrome is not in a standard location.
 *
 * Outputs (public/):
 *   og.png, og-wiki.png, apple-touch-icon.png, icon-192.png, icon-512.png, favicon.svg
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { generateMockUserData } = require('../src/github');
const { renderJungleSvg, renderGhostPortrait } = require('../src/renderer');
const { RANKS } = require('../src/rank');
const { TIERS } = require('../src/ghost-sprites');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gj-og-'));

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(p => p && fs.existsSync(p));

if (!CHROME) {
  console.error('Chrome not found. Set CHROME_PATH.');
  process.exit(1);
}

const GHOST_PATH = 'M0 -28C22 -28 26 -8 24 12C22 24 16 28 12 22C8 16 2 28 -2 22C-6 16 -12 28 -16 22C-20 16 -24 24 -24 10C-26 -8 -22 -28 0 -28Z';
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap" rel="stylesheet">';
const dataUri = svg => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

function shoot(name, html, w, h) {
  const file = path.join(TMP, `${name}.html`);
  fs.writeFileSync(file, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${w},${h}`, '--virtual-time-budget=5000',
    `--screenshot=${path.join(OUT, name)}`, `file:///${file.replace(/\\/g, '/')}`,
  ], { stdio: 'ignore' });
  console.log(`  ✓ public/${name}`);
}

/* ---------- Home card ---------- */
const demo = generateMockUserData('ghost-jungle');
const scene = renderJungleSvg(demo, { theme: 'midnight', bare: true, limit: 8 });

const home = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #05070d; font-family: 'Google Sans', sans-serif; color: #e8edf4; position: relative; }
  .scene { position: absolute; top: -10px; left: 470px; width: 1386px; height: 630px; }
  .scene img { width: 100%; height: 100%; display: block; }
  .shade { position: absolute; inset: 0; background:
      linear-gradient(90deg, #05070d 0%, #05070d 40%, rgba(5,7,13,.7) 50%, rgba(5,7,13,0) 64%),
      linear-gradient(0deg, rgba(5,7,13,.92) 0%, rgba(5,7,13,.5) 12%, rgba(5,7,13,0) 28%); }
  .copy { position: absolute; left: 76px; top: 0; bottom: 0; width: 600px; display: flex; flex-direction: column; justify-content: center; }
  .eyebrow { font-size: 18px; font-weight: 700; letter-spacing: .26em; color: #00f2fe; margin-bottom: 22px; }
  h1 { font-size: 104px; font-weight: 500; letter-spacing: -.045em; line-height: .95; }
  h2 { font-size: 40px; font-weight: 500; letter-spacing: -.02em; margin-top: 18px; color: #cfe8ff; }
  h2 em { font-style: normal; color: #00f2fe; }
  p { font-size: 21px; color: #9aa7b8; margin-top: 22px; line-height: 1.45; max-width: 520px; }
  .foot { position: absolute; left: 76px; right: 76px; bottom: 44px; display: flex; justify-content: space-between; align-items: center; font-size: 19px; color: #8a96a8; }
  .url { color: #e8edf4; font-weight: 500; display: flex; align-items: center; gap: 12px; }
  .url svg { color: #00f2fe; filter: drop-shadow(0 0 10px #00f2fe); }
  .by { color: #8a96a8; font-weight: 400; margin-left: 6px; padding-left: 18px; border-left: 1px solid rgba(255,255,255,.18); }
</style></head><body>
  <div class="scene"><img src="${dataUri(scene)}"></div>
  <div class="shade"></div>
  <div class="copy">
    <div class="eyebrow">GITHUB PROFILE README</div>
    <h1>Ghost Jungle</h1>
    <h2>Your repositories, <em>awakened.</em></h2>
    <p>Every repo becomes a living spirit that evolves with its commits. Exact stats, canopy ranks, one line of Markdown.</p>
  </div>
  <div class="foot">
    <span class="url"><svg viewBox="-32 -36 64 64" width="26" height="26"><path d="${GHOST_PATH}" fill="currentColor"/><ellipse cx="-8" cy="-6" rx="3" ry="4" fill="#05070d"/><ellipse cx="8" cy="-6" rx="3" ry="4" fill="#05070d"/></svg>ghost-jungle.vercel.app<span class="by">by @AtlasRoX</span></span>
  </div>
</body></html>`;

/* ---------- Wiki card ---------- */
const portraits = TIERS.map(t => `<figure style="--c:${t.color}"><img src="${dataUri(renderGhostPortrait(t.tier))}"><figcaption><b>${t.numeral}</b>${t.short}</figcaption></figure>`).join('');
const chips = RANKS.map(r => `<span style="--c:${r.color}">${r.grade}</span>`).join('');
const wiki = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; font-family: 'Google Sans', sans-serif; color: #e8edf4;
    background: radial-gradient(ellipse 70% 60% at 50% 0%, #0f2a44 0%, #05070d 70%); position: relative; }
  .moon { position: absolute; left: 50%; top: -150px; width: 230px; height: 230px; transform: translateX(-50%); border-radius: 50%;
    background: radial-gradient(circle at 40% 36%, #fff, #bfe3ff 55%, #4facfe 100%); box-shadow: 0 0 160px 50px rgba(79,172,254,.22); opacity: .7; }
  .head { position: absolute; top: 168px; left: 0; right: 0; text-align: center; }
  .eyebrow { font-size: 17px; font-weight: 700; letter-spacing: .28em; color: #7dd3fc; }
  h1 { font-size: 76px; font-weight: 500; letter-spacing: -.04em; margin-top: 12px; }
  h1 em { font-style: normal; color: #7dd3fc; }
  .row { position: absolute; left: 60px; right: 60px; top: 318px; display: flex; justify-content: space-between; }
  figure { width: 200px; text-align: center; }
  figure img { width: 170px; height: 170px; display: block; margin: 0 auto; }
  figcaption { font-size: 20px; color: #cbd5e1; margin-top: -6px; }
  figcaption b { color: var(--c); font-weight: 700; letter-spacing: .1em; margin-right: 8px; font-size: 15px; }
  .ranks { position: absolute; bottom: 40px; left: 0; right: 0; display: flex; justify-content: center; gap: 12px; align-items: center; }
  .ranks span { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 17px;
    color: var(--c); border: 2px solid var(--c); box-shadow: 0 0 18px color-mix(in srgb, var(--c) 40%, transparent); }
  .ranks i { font-style: normal; color: #8a96a8; font-size: 18px; margin-right: 10px; }
</style></head><body>
  <div class="moon"></div>
  <div class="head"><div class="eyebrow">THE GHOST JUNGLE WIKI</div><h1>Spirits &amp; <em>ranks</em></h1></div>
  <div class="row">${portraits}</div>
  <div class="ranks"><i>Canopy ranks</i>${chips}</div>
</body></html>`;

/* ---------- Icons ---------- */
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="80%"><stop offset="0%" stop-color="#123150"/><stop offset="100%" stop-color="#05070d"/></radialGradient>
    <radialGradient id="glow"><stop offset="0%" stop-color="#00f2fe" stop-opacity=".55"/><stop offset="100%" stop-color="#00f2fe" stop-opacity="0"/></radialGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="70%" stop-color="#bfefff"/><stop offset="100%" stop-color="#4facfe"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <circle cx="256" cy="270" r="200" fill="url(#glow)"/>
  <g transform="translate(256 266) scale(6.4)">
    <path d="${GHOST_PATH}" fill="url(#body)"/>
    <ellipse cx="-8" cy="-6" rx="3" ry="4.2" fill="#05070d"/><ellipse cx="8" cy="-6" rx="3" ry="4.2" fill="#05070d"/>
    <circle cx="-7" cy="-7.6" r="1.1" fill="#fff"/><circle cx="9" cy="-7.6" r="1.1" fill="#fff"/>
  </g>
</svg>`;
const iconPage = size => `<!doctype html><html><body style="margin:0;background:transparent"><img src="${dataUri(iconSvg)}" width="${size}" height="${size}" style="display:block"></body></html>`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-32 -36 64 64"><path d="${GHOST_PATH}" fill="#e0f2fe"/><ellipse cx="-8" cy="-6" rx="3" ry="4" fill="#05070d"/><ellipse cx="8" cy="-6" rx="3" ry="4" fill="#05070d"/></svg>\n`;

console.log('Building social cards and icons…');
shoot('og.png', home, 1200, 630);
shoot('og-wiki.png', wiki, 1200, 630);
shoot('apple-touch-icon.png', iconPage(180), 180, 180);
shoot('icon-192.png', iconPage(192), 192, 192);
shoot('icon-512.png', iconPage(512), 512, 512);
fs.writeFileSync(path.join(OUT, 'favicon.svg'), favicon);
console.log('  ✓ public/favicon.svg');
fs.rmSync(TMP, { recursive: true, force: true });
