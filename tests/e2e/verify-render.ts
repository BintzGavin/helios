import { Renderer } from '../../packages/renderer/src/index';
import * as path from 'path';
import * as fs from 'fs/promises';

const CASES = [
  { name: 'Canvas', relativePath: 'examples/simple-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'DOM', relativePath: 'examples/simple-animation/composition.html', mode: 'dom' as const },
  { name: 'React', relativePath: 'examples/react-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'React DOM', relativePath: 'examples/react-dom-animation/composition.html', mode: 'dom' as const },
  { name: 'Vue', relativePath: 'examples/vue-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'Vue DOM', relativePath: 'examples/vue-dom-animation/composition.html', mode: 'dom' as const },
  { name: 'Svelte', relativePath: 'examples/svelte-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'Svelte DOM', relativePath: 'examples/svelte-dom-animation/composition.html', mode: 'dom' as const },
  { name: 'ThreeJS', relativePath: 'examples/threejs-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'Pixi', relativePath: 'examples/pixi-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'Helpers', relativePath: 'examples/animation-helpers/composition.html', mode: 'canvas' as const },
  { name: 'React Helpers', relativePath: 'examples/react-animation-helpers/composition.html', mode: 'dom' as const },
  { name: 'Svelte Helpers', relativePath: 'examples/svelte-animation-helpers/composition.html', mode: 'dom' as const },
  { name: 'Vue Helpers', relativePath: 'examples/vue-animation-helpers/composition.html', mode: 'dom' as const },
];

async function main() {
  console.log('Starting E2E verification render for all examples...');

  let failedCases = 0;

  for (const testCase of CASES) {
    console.log(`\nVerifying ${testCase.name}...`);

    // Create a new renderer for each case to ensure clean state
    const renderer = new Renderer({
      width: 600,
      height: 600,
      fps: 30,
      durationInSeconds: 5,
      mode: testCase.mode || 'canvas',
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
    console.log(`✅ All ${CASES.length} examples verified successfully!`);
    process.exit(0);
  }
}

main();
