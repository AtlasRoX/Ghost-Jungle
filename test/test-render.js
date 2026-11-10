/**
 * Ghost Jungle - Test Renderer
 */

const fs = require('fs');
const path = require('path');
const { generateMockUserData } = require('../src/github');
const { renderJungleSvg } = require('../src/renderer');
const { THEMES } = require('../src/themes');

console.log('🔮 Testing Ghost Jungle SVG rendering across themes and ghost tiers...');

const outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const testUsers = ['octocat', 'torvalds', 'mystic-spirit'];

testUsers.forEach(user => {
  const data = generateMockUserData(user);
  
  Object.keys(THEMES).forEach(themeKey => {
    const svg = renderJungleSvg(data, { theme: themeKey, limit: 8 });
    const filename = `jungle-${user}-${themeKey}.svg`;
    fs.writeFileSync(path.join(outDir, filename), svg, 'utf-8');
    console.log(`  ✓ Generated ${filename} (${svg.length} bytes)`);
  });
});

console.log('✨ All test SVG renders completed successfully in test/output/!');
