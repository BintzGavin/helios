import { Renderer } from '../../packages/renderer/dist/index.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

// Specific overrides for mode
const CANVAS_OVERRIDES = new Set([
  'audio-visualization',
  'procedural-generation',
  'react-three-fiber',
  'threejs-canvas-animation',
  'pixi-canvas-animation',
  'p5-canvas-animation',
  'animation-helpers',
  'simple-canvas-animation',
  'react-canvas-animation',
  'vue-canvas-animation',
  'svelte-canvas-animation',
  'solid-canvas-animation'
]);

// Helper to format name: "simple-animation" -> "Simple Animation"
function formatName(dirName: string) {
  return dirName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function discoverCases() {
  const examplesDir = path.resolve(process.cwd(), 'examples');
  const entries = await fs.readdir(examplesDir, { withFileTypes: true });

  const cases = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dirName = entry.name;
      const compPath = path.join(examplesDir, dirName, 'composition.html');

      // We only care if composition.html exists (for Renderer)
      if (existsSync(compPath)) {
        // Determine mode
        let mode: 'dom' | 'canvas' = 'dom';
        if (dirName.includes('canvas') || CANVAS_OVERRIDES.has(dirName)) {
          mode = 'canvas';
        }

        cases.push({
          name: formatName(dirName),
          relativePath: `examples/${dirName}/composition.html`,
          mode: mode
        });
      }
    }
  }
  return cases.sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  const filter = process.argv[2];
  console.log('Starting E2E verification render...');
  console.log('Discovering examples...');

  const allCases = await discoverCases();
  let casesToRun = allCases;

  if (filter) {
    console.log(`Filtering cases by "${filter}"...`);
    casesToRun = allCases.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
  }

  console.log(`Found ${casesToRun.length} examples to verify.`);

  let failedCases = 0;

  for (const testCase of casesToRun) {
    console.log(`\nVerifying ${testCase.name} [${testCase.mode}]...`);

    // Create a new renderer for each case to ensure clean state
    const renderer = new Renderer({
      width: 600,
      height: 600,
      fps: 30,
      durationInSeconds: 5,
      mode: testCase.mode,
    });

    const compositionPath = path.resolve(
      process.cwd(),
      'output/example-build',
      testCase.relativePath
    );

    // Check if file exists first to provide better error message
    try {
        await fs.access(compositionPath);
    } catch {
        console.error(`❌ Build artifact not found: ${compositionPath}`);
        console.error(`   Did you run 'npm run build:examples'?`);
        failedCases++;
        continue;
    }

    const compositionUrl = `file://${compositionPath}`;
    const sanitizedName = testCase.name.toLowerCase().replace(/ /g, '-');
    const outputPath = path.resolve(process.cwd(), `output/${sanitizedName}-render-verified.mp4`);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    try {
      await renderer.render(compositionUrl, outputPath);
      console.log(`✅ ${testCase.name} Passed! Video saved to: ${outputPath}`);
    } catch (error) {
      console.error(`❌ ${testCase.name} Failed:`, error);
      failedCases++;
    }
  }

  console.log('\n--------------------------------------------------');
  if (failedCases > 0) {
    console.error(`❌ Verification finished with ${failedCases} failures.`);
    process.exit(1);
  } else {
    console.log(`✅ All ${casesToRun.length} examples verified successfully!`);
    process.exit(0);
  }
}

main();
