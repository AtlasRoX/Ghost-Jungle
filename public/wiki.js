/**
 * Ghost Jungle — wiki (renders tiers, ranks and the rank calculator from /api/meta)
 */
(async function () {
  'use strict';

  const TRAITS = {
    1: { lore: 'A newborn light. Round, curious, and barely brave enough to drift from the roots. Wisps dart quickly and are the shyest spirits in the jungle.', traits: ['Big curious eyes', 'Blushing cheeks', 'Fast, darting flight', 'Flees your cursor'] },
    2: { lore: 'Grows sleeves of mist that wave as it drifts, and wanders the undergrowth greeting fireflies.', traits: ['Waving mist sleeves', 'Rippling hem', 'Playful glances', 'Shy'] },
    3: { lore: 'Draws a hood of shadow over its face. Only its eyes remain, lit by the language of its code.', traits: ['Shadow hood', 'Glowing language eyes', 'Slower, deliberate drift', 'Wary'] },
    4: { lore: 'A tattered cloak trails behind it, and it carries a swinging lantern that holds the soul of its repository.', traits: ['Tattered cloak strands', 'Pendulum lantern', 'Flickering soul flame', 'Curious about you'] },
    5: { lore: 'A forest deity. Living antlers glow on its brow, and a court of wisps orbits its crown. It moves slowly and with great weight.', traits: ['Living antlers', 'Orbiting familiars', 'Gem sigil', 'Approaches your cursor'] },
  };

  const fmt = n => Number(n || 0).toLocaleString('en-US');
  const meta = await (await fetch('/api/meta')).json();

  // Spirits
  document.getElementById('wiki-tiers').innerHTML = meta.tiers.map((t, i) => {
    const next = meta.tiers[i + 1];
    const req = next ? `${t.min || 1}–${fmt(next.min - 1)} commits` : `${fmt(t.min)}+ commits`;
    const info = TRAITS[t.tier];
    return `<article class="wiki-tier" style="--c:${t.color}" id="tier-${t.tier}">
      <img src="/api/portrait?tier=${t.tier}" alt="${t.title} portrait" width="150" height="150" loading="lazy">
      <div>
        <div class="wiki-tier-head"><span class="numeral">TIER ${t.numeral}</span><h3>${t.title}</h3><span class="req">${req}</span></div>
        <p>${info.lore}</p>
        <ul class="traits">${info.traits.map(x => `<li>${x}</li>`).join('')}</ul>
      </div>
    </article>`;
  }).join('');

  // Ranks
  let prev = 0;
  document.getElementById('wiki-ranks').innerHTML = meta.ranks.map(r => {
    const band = r.top >= 100 ? `BELOW TOP ${prev}%` : `TOP ${r.top}%`;
    prev = r.top;
    return `<article class="wiki-rank" style="--c:${r.color}">
      <span class="grade">${r.grade}</span>
      <span class="title">${r.title}</span>
      <span class="top">${band}</span>
      <p>${r.lore}</p>
    </article>`;
  }).join('');

  document.querySelector('#wiki-metrics tbody').innerHTML = meta.metrics.map(m =>
    `<tr><td>${m.label}</td><td>${fmt(m.median)}</td><td>${m.weight}</td><td>${m.cdf === 'exponential' ? 'Exponential' : 'Log-normal'}</td></tr>`).join('');

  // Calculator: the same formula as src/rank.js
  const form = document.getElementById('calc');
  const out = document.getElementById('calc-result');
  const curve = { exponential: x => 1 - Math.pow(2, -x), lognormal: x => x / (1 + x) };
  function calc() {
    const v = Object.fromEntries(new FormData(form));
    const totalW = meta.metrics.reduce((a, m) => a + m.weight, 0);
    const score = meta.metrics.reduce((a, m) => a + curve[m.cdf](Math.max(0, Number(v[m.key]) || 0) / m.median) * m.weight, 0) / totalW;
    const top = Math.max(0.1, (1 - score) * 100);
    const r = meta.ranks.find(x => top <= x.top) || meta.ranks[meta.ranks.length - 1];
    out.style.setProperty('--c', r.color);
    out.innerHTML = `<span class="grade">${r.grade}</span><div><div class="title">${r.title}</div><div class="top">TOP ${top < 1 ? top.toFixed(1) : Math.round(top)}% · SCORE ${score.toFixed(3)}</div></div>`;
  }
  form.addEventListener('input', calc);
  calc();
})();
