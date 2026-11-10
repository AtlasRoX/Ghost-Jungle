/**
 * Ghost Jungle — playground controller
 *
 * The stage loads the scene in `mode=interactive` (no SMIL wandering) and
 * drives every spirit with a small steering-behaviour simulation:
 *   wander + linger · soft separation · soft stage bounds (beyond the frame)
 *   shy / curious reactions to the cursor · drag & throw with momentum
 *   depth: spirits grow and brighten toward the viewer, sorted by depth
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W = 880;

  const el = {
    form: $('summon-form'), input: $('username-input'),
    host: $('svg-host'), screen: document.querySelector('.screen'), error: $('stage-error'),
    swatches: $('theme-swatches'), themeName: $('theme-name'),
    sound: $('btn-sound'), soundLabel: $('sound-label'),
    code: $('embed-code'), note: $('embed-note'), copy: $('btn-copy'),
    codex: $('codex-grid'),
    inspector: $('inspector'), closeInspect: $('btn-close-inspect'),
    customLimit: $('custom-limit'), limitInput: $('limit-input'),
  };

  const state = {
    username: 'octocat', theme: 'midnight', sort: 'commits', tab: 'markdown',
    limitMode: '10', limit: 10,
    data: null, repos: [], meta: null,
  };
  let requestId = 0;
  let sim = null;

  const LORE = {
    1: 'A newborn light. Round, curious, and barely brave enough to drift from the roots.',
    2: 'Grows sleeves of mist and wanders the undergrowth, waving at fireflies.',
    3: 'Draws a hood of shadow. Only its eyes, lit by its language, are seen.',
    4: 'Carries a lantern holding the soul of its code through the deep canopy.',
    5: 'A forest deity crowned with living antlers, circled by a court of wisps.',
  };

  const fmt = n => Number(n || 0).toLocaleString('en-US');

  /* ---------- URL state ---------- */
  const params = new URLSearchParams(location.search);
  if (params.get('username')) state.username = params.get('username').replace(/^@/, '');
  if (params.get('theme')) state.theme = params.get('theme');
  if (params.get('sort')) state.sort = params.get('sort');
  if (params.get('limit') === 'all') {
    state.limit = 'all';
    state.limitMode = 'all';
  } else if (params.get('limit')) {
    const l = parseInt(params.get('limit'), 10);
    if (l > 0) {
      state.limit = l;
      state.limitMode = l === 10 ? '10' : l === 20 ? '20' : 'custom';
      el.limitInput.value = l;
    }
  }
  el.input.value = state.username;

  function syncUrl() {
    const p = new URLSearchParams({ username: state.username });
    if (state.theme !== 'midnight') p.set('theme', state.theme);
    if (state.limit !== 10) p.set('limit', state.limit);
    if (state.sort !== 'commits') p.set('sort', state.sort);
    history.replaceState(null, '', `?${p}`);
  }

  init();

  async function init() {
    if (!reduceMotion) initAmbient();
    const defaults = { themes: [], tiers: [], ranks: [], languages: {}, limits: { svg: 36, interactive: 60 } };
    try {
      state.meta = { ...defaults, ...(await (await fetchWithTimeout('/api/meta', 10000)).json()) };
    } catch (e) {
      state.meta = defaults;
    }
    state.meta.limits = { ...defaults.limits, ...(state.meta.limits || {}) };
    el.limitInput.max = state.meta.limits.svg;
    buildSwatches();
    buildCodex();
    bindSegmented();
    bindEvents();
    summon();
  }

  /* ---------- Theme ---------- */
  function buildSwatches() {
    el.swatches.innerHTML = '';
    state.meta.themes.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', t.name);
      b.title = t.name;
      b.dataset.theme = t.id;
      b.style.setProperty('--sw-moon', t.moonColor);
      b.style.setProperty('--sw-bg', t.bg);
      b.addEventListener('click', () => setTheme(t.id));
      el.swatches.appendChild(b);
    });
    setTheme(state.theme, true);
  }

  function setTheme(id, silent) {
    const t = state.meta.themes.find(x => x.id === id) || state.meta.themes[0];
    if (!t) return;
    state.theme = t.id;
    el.swatches.querySelectorAll('.swatch').forEach(s => s.setAttribute('aria-checked', String(s.dataset.theme === t.id)));
    el.themeName.textContent = t.name;
    document.documentElement.style.setProperty('--accent', t.floraGlow);
    document.documentElement.style.setProperty('--tint', t.bg);
    if (!silent) { renderSvg(); updateEmbed(); syncUrl(); }
  }

  /* ---------- Segmented controls ---------- */
  function bindSegmented() {
    document.querySelectorAll('.segmented').forEach(group => {
      const key = group.dataset.control;
      const current = () => (key === 'limit' ? state.limitMode : state[key]);
      const sync = () => group.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.value === String(current()))));
      group.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        if (key === 'limit') {
          state.limitMode = b.dataset.value;
          el.customLimit.hidden = state.limitMode !== 'custom';
          if (state.limitMode === 'all') state.limit = 'all';
          else if (state.limitMode === 'custom') { state.limit = clampLimit(el.limitInput.value); el.limitInput.focus(); }
          else state.limit = parseInt(state.limitMode, 10);
          sync();
          renderSvg(); updateEmbed(); syncUrl();
        } else {
          state[key] = b.dataset.value;
          sync();
          summon();
        }
      }));
      sync();
    });
    el.customLimit.hidden = state.limitMode !== 'custom';
  }

  const clampLimit = v => Math.max(1, Math.min(state.meta.limits.svg, parseInt(v, 10) || 1));

  /* ---------- Events ---------- */
  function bindEvents() {
    el.form.addEventListener('submit', e => {
      e.preventDefault();
      const v = el.input.value.trim().replace(/^@/, '');
      if (!v) return;
      state.username = v;
      window.soundEngine?.playSummonSound();
      summon();
    });

    document.querySelectorAll('.try-user').forEach(b => b.addEventListener('click', () => {
      state.username = el.input.value = b.dataset.user;
      window.soundEngine?.playSummonSound();
      summon();
      $('stage').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }));

    let limitTimer;
    el.limitInput.addEventListener('input', () => {
      clearTimeout(limitTimer);
      limitTimer = setTimeout(() => {
        state.limit = clampLimit(el.limitInput.value);
        el.limitInput.value = state.limit;
        renderSvg(); updateEmbed(); syncUrl();
      }, 350);
    });

    el.sound.addEventListener('click', () => {
      const on = window.soundEngine?.toggleMute();
      el.sound.setAttribute('aria-pressed', String(!!on));
      el.soundLabel.textContent = on ? 'Sound on' : 'Sound off';
    });

    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      state.tab = t.dataset.tab;
      document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', String(x === t)));
      updateEmbed();
    }));

    el.copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(el.code.textContent);
        el.copy.textContent = 'Copied';
        el.copy.classList.add('is-done');
        setTimeout(() => { el.copy.textContent = 'Copy'; el.copy.classList.remove('is-done'); }, 1800);
      } catch (e) {
        const r = document.createRange();
        r.selectNodeContents(el.code);
        getSelection().removeAllRanges();
        getSelection().addRange(r);
      }
    });

    el.closeInspect.addEventListener('click', hideInspector);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hideInspector(); });
  }

  /* ---------- Data + render ---------- */
  function showError(msg) {
    el.error.hidden = !msg;
    el.error.textContent = msg || '';
  }

  function fetchWithTimeout(url, ms = 25000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
  }

  const sceneUrl = () => {
    const limitQ = `&limit=${state.limit}`;
    return `/api/ghost-jungle?username=${encodeURIComponent(state.username)}&theme=${state.theme}&sort=${state.sort}${limitQ}&mode=interactive`;
  };

  function setLoading(on, text) {
    if (text) document.getElementById('loader-text').textContent = text;
    el.screen.classList.toggle('is-loading', on);
  }

  // Data and scene load in parallel; the server shares one GitHub fetch between them.
  async function summon() {
    const id = ++requestId;
    setLoading(true, `Summoning @${state.username}'s spirits…`);
    showError('');
    try {
      const [dataRes, svgText] = await Promise.all([
        fetchWithTimeout(`/api/user-data?username=${encodeURIComponent(state.username)}&sort=${state.sort}`),
        fetchWithTimeout(sceneUrl()).then(r => r.text()),
      ]);
      const data = await dataRes.json();
      if (id !== requestId) return;
      if (!dataRes.ok) {
        state.data = null;
        state.repos = [];
        showError(`${data.error}. ${data.detail || ''}`);
        renderRank(null);
      } else {
        state.data = data;
        state.repos = data.repos || [];
        renderRank(data.rank);
      }
      mountSvg(svgText);
      updateEmbed();
      syncUrl();
    } catch (e) {
      if (id === requestId) showError(e.name === 'AbortError' ? 'GitHub is taking too long to answer. Try again in a moment.' : 'Could not reach the server.');
    } finally {
      if (id === requestId) setLoading(false);
    }
  }

  // Theme / limit changes only need a new scene (data is cached server-side)
  async function renderSvg() {
    const id = ++requestId;
    setLoading(true, 'Rearranging the jungle…');
    try {
      const text = await (await fetchWithTimeout(sceneUrl())).text();
      if (id === requestId) mountSvg(text);
    } catch (e) {
      if (id === requestId) showError('Could not redraw the scene.');
    } finally {
      if (id === requestId) setLoading(false);
    }
  }

  function mountSvg(text) {
    if (sim) { sim.stop(); sim = null; }
    el.host.innerHTML = text;
    hideInspector();
    const svg = el.host.querySelector('svg');
    if (!svg || !svg.querySelector('#ghost-sanctuary .g-scale')) return;
    try {
      sim = createSimulation(svg);
    } catch (e) {
      console.error('Spirit simulation failed', e);
    }
  }

  function tierFor(commits) {
    const tiers = state.meta.tiers;
    for (let i = tiers.length - 1; i >= 0; i--) if (Math.max(1, commits) >= tiers[i].min) return tiers[i];
    return tiers[0];
  }

  /* ---------- Spirit simulation ---------- */
  function createSimulation(svg) {
    const sanct = svg.querySelector('#ghost-sanctuary');
    const s0 = parseFloat(sanct.dataset.s0) || 1;
    const yTop = parseFloat(sanct.dataset.ytop) || 130;
    const yBot = parseFloat(sanct.dataset.ybot) || 290;
    const ptr = { x: 0, y: 0, inside: false };
    let drag = null;
    let raf = 0;
    let running = true;
    let visible = true;
    let frame = 0;
    let last = performance.now();

    // Captions: always for the 8 strongest, others on hover / drag
    const strongest = new Set(state.repos.slice(0, state.limit === 'all' ? undefined : state.limit)
      .map((r, i) => [r.commits, i]).sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]));

    const spirits = [...sanct.querySelectorAll('.ghost')].map(g => {
      const idx = Number(g.dataset.index);
      const tier = Number(g.dataset.tier) || 1;
      const caption = g.querySelector('.caption');
      const sp = {
        g, idx, tier,
        anchor: g.parentNode.tagName.toLowerCase() === 'a' ? g.parentNode : g,
        scaleG: g.querySelector('.g-scale'),
        fadeG: g.querySelector('.g-fade'),
        actG: g.querySelector('.g-act'),
        caption,
        gap: caption ? Number(caption.dataset.gap) : 40,
        x: parseFloat(g.dataset.x), y: parseFloat(g.dataset.y),
        vx: 0, vy: 0,
        heading: Math.random() * Math.PI * 2,
        cruise: (0.62 - tier * 0.06) * (0.8 + Math.random() * 0.4),
        linger: Math.random() * 2,
        lean: 0,
        hover: false,
        labelled: strongest.has(idx),
      };
      if (caption) caption.style.opacity = sp.labelled ? 1 : 0;
      return sp;
    });

    const toSvg = e => {
      const p = svg.createSVGPoint();
      p.x = e.clientX; p.y = e.clientY;
      return p.matrixTransform(svg.getScreenCTM().inverse());
    };
    const spiritOf = target => {
      const g = target.closest && target.closest('.ghost');
      return g ? spirits.find(s => s.g === g) : null;
    };
    const showLabel = (sp, on) => { if (sp.caption) sp.caption.style.opacity = on || sp.labelled ? 1 : 0; };

    /* Pointer + drag */
    svg.addEventListener('pointermove', e => {
      const p = toSvg(e);
      ptr.x = p.x; ptr.y = p.y; ptr.inside = true;
      if (drag) {
        if (!drag.moved && Math.hypot(p.x - drag.startX, p.y - drag.startY) > 4) {
          drag.moved = true;
          drag.sp.g.classList.add('is-dragging');
          showLabel(drag.sp, true);
        }
      }
    });
    svg.addEventListener('pointerleave', () => { ptr.inside = false; });
    svg.addEventListener('pointerdown', e => {
      const sp = spiritOf(e.target);
      if (!sp) return;
      e.preventDefault();
      const p = toSvg(e);
      drag = { sp, offX: sp.x - p.x, offY: sp.y - p.y, startX: p.x, startY: p.y, moved: false, px: sp.x, py: sp.y };
      svg.setPointerCapture(e.pointerId);
    });
    const endDrag = () => {
      if (!drag) return;
      const { sp, moved } = drag;
      sp.g.classList.remove('is-dragging');
      if (!moved) inspect(sp);
      else {
        showLabel(sp, sp.hover);
        window.soundEngine?.playGhostChime(sp.tier);
      }
      drag = null;
    };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    svg.addEventListener('dblclick', e => {
      const sp = spiritOf(e.target);
      if (!sp) return;
      sp.actG.classList.remove('boo');
      void sp.actG.getBoundingClientRect();
      sp.actG.classList.add('boo');
      sp.vy -= 3.2;
      sp.vx += (Math.random() - 0.5) * 4;
      window.soundEngine?.playSummonSound();
    });

    spirits.forEach(sp => {
      sp.anchor.addEventListener('click', e => e.preventDefault());
      sp.g.setAttribute('tabindex', '0');
      sp.g.addEventListener('pointerenter', () => {
        sp.hover = true;
        showLabel(sp, true);
        const repo = state.repos[sp.idx];
        if (repo && !drag) { window.soundEngine?.playGhostChime(sp.tier); inspect(sp); }
      });
      sp.g.addEventListener('pointerleave', () => { sp.hover = false; showLabel(sp, drag && drag.sp === sp); });
      sp.g.addEventListener('focus', () => inspect(sp));
      sp.g.addEventListener('keydown', e => { if (e.key === 'Enter') inspect(sp); });
    });

    /* Step */
    function step(f) {
      const L = -48, R = W + 48;
      for (const sp of spirits) {
        if (drag && drag.sp === sp) {
          const tx = ptr.x + drag.offX;
          const ty = ptr.y + drag.offY;
          const nx = sp.x + (tx - sp.x) * Math.min(1, 0.35 * f);
          const ny = sp.y + (ty - sp.y) * Math.min(1, 0.35 * f);
          sp.vx = (nx - sp.x) / f;
          sp.vy = (ny - sp.y) / f;
          sp.x = nx; sp.y = ny;
          continue;
        }

        let ax = 0, ay = 0;
        const speed = Math.hypot(sp.vx, sp.vy);
        const coasting = speed > sp.cruise * 2.2; // thrown: let momentum carry it

        if (!coasting && !reduceMotion) {
          sp.heading += (Math.random() - 0.5) * 0.3 * f;
          if (sp.linger > 0) {
            sp.linger -= f / 60;
          } else if (Math.random() < 0.0025 * f) {
            sp.linger = 0.8 + Math.random() * 2.4;
          }
          const cruise = sp.linger > 0 ? 0 : sp.cruise;
          ax += (Math.cos(sp.heading) * cruise - sp.vx) * 0.03;
          ay += (Math.sin(sp.heading) * cruise * 0.55 - sp.vy) * 0.03;
        }

        // Soft bounds: the frame edges are permeable, the band is a gentle spring
        if (sp.x < L) { ax += (L - sp.x) * 0.004; sp.heading = 0; }
        if (sp.x > R) { ax -= (sp.x - R) * 0.004; sp.heading = Math.PI; }
        if (sp.y < yTop) ay += (yTop - sp.y) * 0.006;
        if (sp.y > yBot) ay -= (sp.y - yBot) * 0.008;

        // Separation
        const rad = 46 * s0;
        for (const o of spirits) {
          if (o === sp) continue;
          const dx = sp.x - o.x, dy = (sp.y - o.y) * 1.4;
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < rad) {
            const k = (1 - d / rad) * 0.18;
            ax += (dx / d) * k;
            ay += (dy / d) * k * 0.6;
          }
        }

        // Cursor: small spirits are shy, titans and wraiths are curious
        if (ptr.inside && !drag && !reduceMotion) {
          const dx = sp.x - ptr.x, dy = sp.y - ptr.y;
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < 120) {
            if (sp.tier <= 3) {
              const k = (1 - d / 120) * 0.22;
              ax += (dx / d) * k; ay += (dy / d) * k;
            } else if (d > 64) {
              ax -= (dx / d) * 0.025; ay -= (dy / d) * 0.025;
            }
          }
        }

        sp.vx = (sp.vx + ax * f) * Math.pow(0.985, f);
        sp.vy = (sp.vy + ay * f) * Math.pow(0.985, f);
        const max = coasting ? 14 : sp.cruise * 3;
        const v = Math.hypot(sp.vx, sp.vy);
        if (v > max) { sp.vx *= max / v; sp.vy *= max / v; }
        sp.x += sp.vx * f;
        sp.y += sp.vy * f;
        // a hard floor and ceiling so a thrown spirit never vanishes for good
        sp.x = Math.max(-140, Math.min(W + 140, sp.x));
        sp.y = Math.max(70, Math.min(372, sp.y));
      }
    }

    function draw() {
      for (const sp of spirits) {
        const t = Math.max(-0.3, Math.min(1.3, (sp.y - yTop) / Math.max(1, yBot - yTop)));
        const s = s0 * (0.8 + 0.26 * t);
        sp.lean += (Math.max(-14, Math.min(14, sp.vx * 4)) - sp.lean) * 0.12;
        sp.g.setAttribute('transform', `translate(${sp.x.toFixed(1)}, ${sp.y.toFixed(1)})`);
        sp.scaleG.setAttribute('transform', `scale(${s.toFixed(3)}) rotate(${sp.lean.toFixed(1)})`);
        sp.fadeG.setAttribute('opacity', Math.max(0.55, Math.min(1, 0.62 + 0.38 * t)).toFixed(2));
        if (sp.caption) sp.caption.setAttribute('transform', `translate(0, ${(sp.gap * s + 14).toFixed(1)})`);
      }
      // Depth sort: nearer (lower) spirits paint last
      if (frame % 12 === 0) {
        const order = spirits.slice().sort((a, b) => a.y - b.y);
        let changed = false;
        const kids = [...sanct.children].filter(n => n.tagName.toLowerCase() !== 'defs');
        order.forEach((sp, i) => { if (kids[i] !== sp.anchor) changed = true; });
        if (changed) order.forEach(sp => sanct.appendChild(sp.anchor));
      }
    }

    function loop(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible) {
        step(dt * 60);
        draw();
        frame++;
      }
      raf = requestAnimationFrame(loop);
    }

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = performance.now(); });
    io.observe(svg);
    const onVis = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', onVis);
    draw();
    raf = requestAnimationFrame(loop);

    return {
      stop() {
        running = false;
        cancelAnimationFrame(raf);
        io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
      },
    };
  }

  /* ---------- Inspector ---------- */
  function relTime(iso) {
    if (!iso) return '–';
    const days = Math.round((Date.now() - new Date(iso)) / 86400000);
    if (days < 1) return 'today';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.round(days / 30)}mo ago`;
    return `${(days / 365).toFixed(1)}y ago`;
  }

  function inspect(sp) {
    const repo = state.repos[sp.idx];
    if (!repo) return;
    const tier = tierFor(repo.commits);
    document.querySelectorAll('.screen-svg .ghost.is-active').forEach(n => n.classList.remove('is-active'));
    sp.g.classList.add('is-active');

    const next = state.meta.tiers.find(t => t.min > Math.max(1, repo.commits));
    const floor = tier.min;
    const pct = next ? Math.round(((repo.commits - floor) / (next.min - floor)) * 100) : 100;

    $('inspect-tier').textContent = `Tier ${tier.numeral} · ${tier.title}`;
    $('inspect-tier').style.setProperty('--c', tier.color);
    $('inspect-title').textContent = repo.name;
    $('inspect-desc').textContent = repo.description || 'A quiet spirit drifting between the branches.';
    $('inspect-lang').textContent = repo.language || 'Unknown';
    $('inspect-lang-dot').style.background = repo.languageColor || state.meta.languages[repo.language] || state.meta.languages.Unknown;
    $('inspect-commits').textContent = fmt(repo.commits);
    $('inspect-stars').textContent = fmt(repo.stars);
    $('inspect-forks').textContent = fmt(repo.forks);
    $('inspect-updated').textContent = relTime(repo.pushedAt);
    $('inspect-exact').textContent = repo.commitsExact ? 'Exact' : 'Estimated';
    const bar = $('inspect-progress');
    bar.style.setProperty('--c', tier.color);
    bar.style.width = `${Math.max(4, Math.min(100, pct))}%`;
    $('inspect-next').textContent = next
      ? `${fmt(next.min - repo.commits)} commits until it becomes a ${next.title}.`
      : 'Fully evolved. Nothing in the jungle is older.';
    $('inspect-link').href = repo.url || `https://github.com/${repo.owner}/${repo.name}`;

    el.inspector.classList.add('is-visible');
    el.inspector.setAttribute('aria-hidden', 'false');
  }

  function hideInspector() {
    el.inspector.classList.remove('is-visible');
    el.inspector.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('.screen-svg .ghost.is-active').forEach(n => n.classList.remove('is-active'));
  }

  /* ---------- Rank card ---------- */
  function renderRank(rank) {
    const card = $('rank-card');
    if (!rank) {
      $('rank-grade').textContent = '–';
      $('rank-title').textContent = 'No rank yet';
      $('rank-top').textContent = '';
      $('rank-metrics').innerHTML = '';
      $('rank-next').textContent = '';
      $('rank-arc').setAttribute('stroke-dasharray', `0 400`);
      return;
    }
    card.style.setProperty('--rc', rank.color);
    $('rank-grade').textContent = rank.grade;
    $('rank-title').textContent = rank.title;
    $('rank-top').textContent = `${rank.topLabel} OF GITHUB USERS (ESTIMATE)`;
    const C = 2 * Math.PI * 50;
    requestAnimationFrame(() => $('rank-arc').setAttribute('stroke-dasharray', `${(C * Math.max(0.03, rank.score)).toFixed(1)} ${C.toFixed(1)}`));
    $('rank-metrics').innerHTML = rank.parts.map(p => `
      <div class="metric" title="Median ${fmt(p.median)} · weight ${p.weight}">
        <span class="metric-name">${p.label}</span>
        <span class="metric-bar"><span data-w="${(p.cdf * 100).toFixed(1)}"></span></span>
        <span class="metric-value">${fmt(p.value)}${p.key === 'commits' && state.data && state.data.commitsExact === false ? '*' : ''}</span>
      </div>`).join('');
    requestAnimationFrame(() => document.querySelectorAll('.metric-bar span').forEach(s => { s.style.width = `${s.dataset.w}%`; }));
    $('rank-next').textContent = rank.next
      ? `Next: ${rank.next.title} (${rank.next.grade}) begins at the top ${rank.next.top}%.`
      : 'The highest rank in the canopy.';
  }

  /* ---------- Embed ---------- */
  function updateEmbed() {
    const origin = location.origin;
    const u = encodeURIComponent(state.username);
    const q = [`username=${u}`];
    if (state.theme !== 'midnight') q.push(`theme=${state.theme}`);
    if (state.limit !== 10) q.push(`limit=${state.limit}`);
    if (state.sort !== 'commits') q.push(`sort=${state.sort}`);
    const api = `${origin}/api/ghost-jungle?${q.join('&')}`;
    const page = `${origin}/?${q.join('&')}`;
    const alt = `${state.username}'s Ghost Jungle`;
    const cap = state.meta.limits.svg;
    const howMany = state.limit === 'all' ? `all repositories (up to ${cap})` : `the top ${state.limit} by ${state.sort === 'commits' ? 'commits' : state.sort === 'stars' ? 'stars' : 'recent activity'}`;
    const cliLimit = state.limit === 10 ? '' : ` --limit ${state.limit}`;

    const snippets = {
      markdown: {
        code: `[![${alt}](${api})](${page})`,
        note: `Shows ${howMany}. Top 10 is the default; add limit=20 (any number) or limit=all to the link. GitHub caches images for about an hour.`,
      },
      html: {
        code: `<a href="${page}">\n  <img src="${api}" alt="${alt}" width="100%" />\n</a>`,
        note: `Shows ${howMany}. The scene is 2.2:1 and scales to any width.`,
      },
      action: {
        code: `# .github/workflows/ghost-jungle.yml in ${state.username}/${state.username}\nname: Ghost Jungle\non:\n  schedule: [{ cron: '0 0 * * *' }]\n  workflow_dispatch:\npermissions:\n  contents: write\njobs:\n  generate:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npx --yes github:AtlasRoX/Ghost-Jungle --username \${{ github.repository_owner }} --theme ${state.theme}${cliLimit} --output ghost-jungle.svg\n        env:\n          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}\n      - run: |\n          git config user.name "ghost-jungle[bot]"\n          git config user.email "actions@users.noreply.github.com"\n          git add ghost-jungle.svg\n          git diff --cached --quiet || git commit -m "Update Ghost Jungle"\n          git push`,
        note: 'No server needed. Then reference ./ghost-jungle.svg in your README.',
      },
    };
    el.code.textContent = snippets[state.tab].code;
    el.note.textContent = snippets[state.tab].note;
  }

  /* ---------- Codex ---------- */
  function buildCodex() {
    el.codex.innerHTML = '';
    state.meta.tiers.forEach((t, i) => {
      const next = state.meta.tiers[i + 1];
      const li = document.createElement('li');
      li.className = 'tier-card';
      li.style.setProperty('--c', t.color);
      li.innerHTML = `
        <span class="tier-numeral">${t.numeral}</span>
        <img src="/api/portrait?tier=${t.tier}" alt="" loading="lazy" width="120" height="120">
        <div class="tier-name">${t.title}</div>
        <div class="tier-req">${next ? `${t.min || 1}–${next.min - 1}` : `${t.min}+`} commits</div>
        <p class="tier-lore">${LORE[t.tier]}</p>`;
      el.codex.appendChild(li);
    });
  }

  /* ---------- Ambient particles ---------- */
  function initAmbient() {
    const canvas = $('ambient-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h;
    const resize = () => {
      w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);

    const motes = Array.from({ length: 28 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.6 + 0.4, vy: -(Math.random() * 0.25 + 0.06),
      phase: Math.random() * Math.PI * 2, speed: Math.random() * 0.012 + 0.004,
    }));

    let running = true;
    document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(tick); });

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7dd3fc';
      for (const m of motes) {
        m.phase += m.speed;
        m.y += m.vy;
        m.x += Math.sin(m.phase) * 0.18;
        if (m.y < -10) { m.y = h + 10; m.x = Math.random() * w; }
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(m.phase * 2));
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 6);
        g.addColorStop(0, accent);
        g.addColorStop(1, 'transparent');
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
})();
