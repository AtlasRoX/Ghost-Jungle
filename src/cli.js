/**
 * Ghost Jungle - CLI Generator for GitHub Actions & Local Scripts
 * 
 * Usage:
 *   node src/cli.js --username octocat --theme midnight --output ghost-jungle.svg
 */

const fs = require('fs');
const path = require('path');
const { getGhostJungleData } = require('./github');
const { renderJungleSvg } = require('./renderer');

async function main() {
  const args = process.argv.slice(2);
  const options = {
    username: 'octocat',
    theme: 'midnight',
    limit: 8,
    sort: 'commits',
    output: 'ghost-jungle.svg'
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--username' && args[i + 1]) {
      options.username = args[++i];
    } else if (args[i] === '--theme' && args[i + 1]) {
      options.theme = args[++i];
    } else if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[++i], 10);
    } else if (args[i] === '--sort' && args[i + 1]) {
      options.sort = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[++i];
    }
  }

  console.log(`🌿 Summoning Ghost Jungle for @${options.username} [Theme: ${options.theme}]...`);

  try {
    const data = await getGhostJungleData(options.username, {
      limit: options.limit,
      sort: options.sort
    });

    const svg = renderJungleSvg(data, {
      theme: options.theme,
      limit: options.limit
    });

    const outputPath = path.resolve(process.cwd(), options.output);
    fs.writeFileSync(outputPath, svg, 'utf-8');

    console.log(`✨ Successfully generated Ghost Jungle SVG at: ${outputPath} (${svg.length} bytes)`);
  } catch (err) {
    console.error('❌ Failed to generate Ghost Jungle:', err);
    process.exit(1);
  }
}

main();
