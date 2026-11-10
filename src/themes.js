/**
 * Ghost Jungle - Theme Palettes & Environmental Lighting
 */

const THEMES = {
  midnight: {
    name: 'Midnight Bayou',
    bgGradient: ['#040a12', '#081726', '#02070c'],
    moonColor: '#4facfe',
    moonGlow: 'rgba(79, 172, 254, 0.25)',
    mistColor: '#173652',
    vinesColor: '#0a2335',
    floraGlow: '#00f2fe',
    foliageColor: '#04121d',
    mushroomCap: '#00f2fe',
    mushroomStem: '#0072b2',
    fireflyColor: '#53fdd7',
    textColor: '#e0f2fe',
    textDim: '#7dd3fc',
    accentBorder: 'rgba(56, 189, 248, 0.3)',
    cardBg: 'rgba(8, 23, 38, 0.75)',
  },
  emerald: {
    name: 'Toxic Mangrove',
    bgGradient: ['#021208', '#072412', '#010904'],
    moonColor: '#2af598',
    moonGlow: 'rgba(42, 245, 152, 0.25)',
    mistColor: '#0e3a1d',
    vinesColor: '#092613',
    floraGlow: '#00ff87',
    foliageColor: '#031409',
    mushroomCap: '#10b981',
    mushroomStem: '#065f46',
    fireflyColor: '#a7f3d0',
    textColor: '#d1fae5',
    textDim: '#6ee7b7',
    accentBorder: 'rgba(16, 185, 129, 0.3)',
    cardBg: 'rgba(7, 36, 18, 0.75)',
  },
  bloodmoon: {
    name: 'Crimson Eclipse',
    bgGradient: ['#140306', '#2a070e', '#0b0103'],
    moonColor: '#ff0844',
    moonGlow: 'rgba(255, 8, 68, 0.3)',
    mistColor: '#420b16',
    vinesColor: '#2b060d',
    floraGlow: '#ff4e50',
    foliageColor: '#180307',
    mushroomCap: '#ff2a5f',
    mushroomStem: '#8b0022',
    fireflyColor: '#ffb3ba',
    textColor: '#ffe4e6',
    textDim: '#fda4af',
    accentBorder: 'rgba(244, 63, 94, 0.3)',
    cardBg: 'rgba(42, 7, 14, 0.75)',
  },
  cyberpunk: {
    name: 'Neon Undergrowth',
    bgGradient: ['#0b021a', '#1a0933', '#06010e'],
    moonColor: '#f72585',
    moonGlow: 'rgba(247, 37, 133, 0.35)',
    mistColor: '#301254',
    vinesColor: '#200b3b',
    floraGlow: '#4cc9f0',
    foliageColor: '#100320',
    mushroomCap: '#7209b7',
    mushroomStem: '#3f37c9',
    fireflyColor: '#f72585',
    textColor: '#fae8ff',
    textDim: '#f0abfc',
    accentBorder: 'rgba(217, 70, 239, 0.35)',
    cardBg: 'rgba(26, 9, 51, 0.75)',
  },
  abyss: {
    name: 'Sunken Leviathan',
    bgGradient: ['#020b14', '#06192d', '#01050a'],
    moonColor: '#38ef7d',
    moonGlow: 'rgba(56, 239, 125, 0.25)',
    mistColor: '#0a3055',
    vinesColor: '#051f38',
    floraGlow: '#11998e',
    foliageColor: '#020f1c',
    mushroomCap: '#00d2ff',
    mushroomStem: '#005999',
    fireflyColor: '#70e000',
    textColor: '#e2f8ff',
    textDim: '#70cfff',
    accentBorder: 'rgba(17, 153, 142, 0.3)',
    cardBg: 'rgba(6, 25, 45, 0.75)',
  }
};

const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Shell: '#89e051',
  Lua: '#000080',
  Elixir: '#6e4a7e',
  Unknown: '#38bdf8'
};

function getTheme(themeName) {
  return THEMES[themeName?.toLowerCase()] || THEMES.midnight;
}

function getLanguageColor(lang) {
  return LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.Unknown;
}

module.exports = {
  THEMES,
  LANGUAGE_COLORS,
  getTheme,
  getLanguageColor
};
