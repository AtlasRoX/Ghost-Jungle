/**
 * Ghost Jungle - Interactive App Engine & Ambient Canvas
 */

(function () {
  // Elements
  const form = document.getElementById('summon-form');
  const usernameInput = document.getElementById('username-input');
  const themeSelect = document.getElementById('theme-select');
  const limitSelect = document.getElementById('limit-select');
  const sortSelect = document.getElementById('sort-select');
  const refreshBtn = document.getElementById('btn-refresh');
  const soundBtn = document.getElementById('btn-sound');
  const soundIcon = document.getElementById('sound-icon');
  const soundLabel = document.getElementById('sound-label');
  const svgHost = document.getElementById('svg-host');
  const loader = document.getElementById('stage-loader');

  // Embed elements
  const markdownCode = document.getElementById('markdown-code');
  const htmlCode = document.getElementById('html-code');
  const btnCopyMd = document.getElementById('btn-copy-md');
  const btnCopyHtml = document.getElementById('btn-copy-html');

  // Inspector elements
  const inspector = document.getElementById('inspector');
  const inspectTier = document.getElementById('inspect-tier');
  const inspectTitle = document.getElementById('inspect-title');
  const inspectDesc = document.getElementById('inspect-desc');
  const inspectLang = document.getElementById('inspect-lang');
  const inspectLangDot = document.getElementById('inspect-lang-dot');
  const inspectCommits = document.getElementById('inspect-commits');
  const inspectStars = document.getElementById('inspect-stars');
  const inspectLink = document.getElementById('inspect-link');
  const btnCloseInspect = document.getElementById('btn-close-inspect');

  // State
  let currentUsername = 'octocat';
  let currentTheme = 'midnight';
  let currentLimit = 8;
  let currentSort = 'commits';
  let currentRepos = [];

  // Parse URL parameters on load
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('username')) {
    currentUsername = urlParams.get('username');
    usernameInput.value = currentUsername;
  }
  if (urlParams.get('theme')) {
    currentTheme = urlParams.get('theme');
    themeSelect.value = currentTheme;
  }

  // 1. Initialize Ambient Particles Canvas
  initAmbientCanvas();

  // 2. Fetch and render jungle
  summonJungle(currentUsername);

  // Event Listeners
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = usernameInput.value.trim();
    if (val) {
      currentUsername = val;
      if (window.soundEngine) window.soundEngine.playSummonSound();
      summonJungle(currentUsername);
    }
  });

  themeSelect.addEventListener('change', () => {
    currentTheme = themeSelect.value;
    updateEmbedCode();
    renderLiveSvg();
  });

  limitSelect.addEventListener('change', () => {
    currentLimit = parseInt(limitSelect.value, 10);
    summonJungle(currentUsername);
  });

  sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    summonJungle(currentUsername);
  });

  refreshBtn.addEventListener('click', () => {
    summonJungle(currentUsername);
  });

  // Sound toggle button
  soundBtn.addEventListener('click', () => {
    if (window.soundEngine) {
      const active = window.soundEngine.toggleMute();
      soundIcon.textContent = active ? '🔊' : '🔇';
      soundLabel.textContent = active ? 'Sound: On' : 'Sound: Off';
      soundBtn.style.borderColor = active ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.12)';
    }
  });

  // Quick user tag clicks
  document.querySelectorAll('.user-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const u = tag.getAttribute('data-user');
      usernameInput.value = u;
      currentUsername = u;
      if (window.soundEngine) window.soundEngine.playSummonSound();
      summonJungle(u);
    });
  });

  // Close inspector button
  btnCloseInspect.addEventListener('click', () => {
    inspector.classList.remove('visible');
  });

  // Copy buttons
  btnCopyMd.addEventListener('click', () => {
    copyToClipboard(markdownCode.textContent, btnCopyMd, 'Markdown Copied! ✨');
  });

  btnCopyHtml.addEventListener('click', () => {
    copyToClipboard(htmlCode.textContent, btnCopyHtml, 'HTML Copied! ✨');
  });

  /**
   * Summon spirits from API
   */
  async function summonJungle(username) {
    loader.classList.add('active');

    try {
      // Fetch repo metadata
      const res = await fetch(`/api/user-data?username=${encodeURIComponent(username)}&limit=${currentLimit}&sort=${currentSort}`);
      const data = await res.json();
      currentRepos = data.repos || [];

      // Render live SVG
      await renderLiveSvg();
      updateEmbedCode();
    } catch (err) {
      console.error('Error summoning jungle:', err);
    } finally {
      loader.classList.remove('active');
    }
  }

  /**
   * Render Live SVG into container and attach interactive listeners
   */
  async function renderLiveSvg() {
    const svgUrl = `/api/ghost-jungle?username=${encodeURIComponent(currentUsername)}&theme=${currentTheme}&limit=${currentLimit}&sort=${currentSort}`;
    
    try {
      const res = await fetch(svgUrl);
      const svgText = await res.text();
      svgHost.innerHTML = svgText;

      // Attach hover & click handlers to ghost entities
      attachGhostInteractivity();
    } catch (err) {
      console.error('Failed to load SVG preview:', err);
    }
  }

  /**
   * Attach interactive events to SVG ghost elements
   */
  function attachGhostInteractivity() {
    const ghostElements = svgHost.querySelectorAll('.ghost-entity');

    ghostElements.forEach((el, index) => {
      const repo = currentRepos[index];
      if (!repo) return;

      const tier = getTierLevel(repo.commits);

      el.addEventListener('mouseenter', () => {
        if (window.soundEngine) {
          window.soundEngine.playGhostChime(tier);
        }
        showInspector(repo, tier);
      });

      el.addEventListener('click', (e) => {
        // Prevent default navigation if inspecting on desktop, or let them click
        showInspector(repo, tier);
      });
    });
  }

  function getTierLevel(commits) {
    if (commits >= 500) return 5;
    if (commits >= 200) return 4;
    if (commits >= 50) return 3;
    if (commits >= 10) return 2;
    return 1;
  }

  function getTierName(tier) {
    const names = {
      1: '🌱 Tier 1 • Lesser Wisp',
      2: '🌿 Tier 2 • Forest Specter',
      3: '🔮 Tier 3 • Phantom Stalker',
      4: '👑 Tier 4 • Wraith Archon',
      5: '🌌 Tier 5 • Ancient Eldritch Titan'
    };
    return names[tier] || names[1];
  }

  function showInspector(repo, tier) {
    inspectTier.textContent = getTierName(tier);
    inspectTitle.textContent = repo.name;
    inspectDesc.textContent = repo.description || 'A mysterious repository spirit drifting between enchanted branches.';
    inspectLang.textContent = repo.language || 'Unknown';
    inspectLangDot.style.backgroundColor = getLanguageColor(repo.language);
    inspectCommits.textContent = `${repo.commits} commits`;
    inspectStars.textContent = `${repo.stars} stars`;
    inspectLink.href = repo.url || `https://github.com/${repo.owner}/${repo.name}`;

    inspector.classList.add('visible');
  }

  function getLanguageColor(lang) {
    const colors = {
      TypeScript: '#3178c6',
      JavaScript: '#f1e05a',
      Python: '#3572A5',
      Rust: '#dea584',
      Go: '#00ADD8',
      'C++': '#f34b7d',
      Java: '#b07219',
      HTML: '#e34c26',
      CSS: '#563d7c',
      Shell: '#89e051'
    };
    return colors[lang] || '#38bdf8';
  }

  /**
   * Update Markdown & HTML code blocks
   */
  function updateEmbedCode() {
    const origin = window.location.origin;
    const apiUrl = `${origin}/api/ghost-jungle?username=${encodeURIComponent(currentUsername)}&theme=${currentTheme}`;
    const interactiveUrl = `${origin}/?username=${encodeURIComponent(currentUsername)}`;

    const md = `[![${currentUsername}'s Ghost Jungle](${apiUrl})](${interactiveUrl})`;
    const html = `<a href="${interactiveUrl}">\n  <img src="${apiUrl}" alt="${currentUsername}'s Ghost Jungle" width="880" />\n</a>`;

    markdownCode.textContent = md;
    htmlCode.textContent = html;
  }

  /**
   * Copy helper
   */
  function copyToClipboard(text, btn, successMessage) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = btn.textContent;
      btn.textContent = successMessage;
      btn.style.background = 'var(--accent-emerald)';
      btn.style.color = '#020814';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.color = '';
      }, 2000);
    });
  }

  /**
   * Canvas Ambient Fireflies / Floating Spirit Spores
   */
  function initAmbientCanvas() {
    const canvas = document.getElementById('ambient-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 35;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: -Math.random() * 0.5 - 0.2,
        alpha: Math.random() * 0.7 + 0.2,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        color: Math.random() > 0.4 ? '#38bdf8' : (Math.random() > 0.5 ? '#34d399' : '#c084fc')
      });
    }

    function renderParticles() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.alpha += Math.sin(Date.now() * p.pulseSpeed * 0.05) * 0.015;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(0.85, p.alpha));
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      });

      requestAnimationFrame(renderParticles);
    }

    renderParticles();
  }
})();
