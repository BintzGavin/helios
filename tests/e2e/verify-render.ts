import { Renderer } from '../../packages/renderer/dist/index.js';
import * as path from 'path';
import * as fs from 'fs/promises';

const CASES = [
  { name: 'Canvas', relativePath: 'examples/simple-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'DOM', relativePath: 'examples/simple-animation/composition.html', mode: 'dom' as const },
  { name: 'React', relativePath: 'examples/react-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'React DOM', relativePath: 'examples/react-dom-animation/composition.html', mode: 'dom' as const },
  { name: 'React CSS', relativePath: 'examples/react-css-animation/composition.html', mode: 'dom' as const },
  { name: 'Vue', relativePath: 'examples/vue-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'Vue DOM', relativePath: 'examples/vue-dom-animation/composition.html', mode: 'dom' as const },
  { name: 'Svelte', relativePath: 'examples/svelte-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'Svelte DOM', relativePath: 'examples/svelte-dom-animation/composition.html', mode: 'dom' as const },
  { name: 'Svelte Transitions', relativePath: 'examples/svelte-transitions/composition.html', mode: 'dom' as const },
  { name: 'Svelte Runes', relativePath: 'examples/svelte-runes-animation/composition.html', mode: 'dom' as const },
  { name: 'ThreeJS', relativePath: 'examples/threejs-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'Pixi', relativePath: 'examples/pixi-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'P5', relativePath: 'examples/p5-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'Helpers', relativePath: 'examples/animation-helpers/composition.html', mode: 'canvas' as const },
  { name: 'React Helpers', relativePath: 'examples/react-animation-helpers/composition.html', mode: 'dom' as const },
  { name: 'Svelte Helpers', relativePath: 'examples/svelte-animation-helpers/composition.html', mode: 'dom' as const },
  { name: 'Vue Helpers', relativePath: 'examples/vue-animation-helpers/composition.html', mode: 'dom' as const },
  { name: 'GSAP', relativePath: 'examples/gsap-animation/composition.html', mode: 'dom' as const },
  { name: 'Framer Motion', relativePath: 'examples/framer-motion-animation/composition.html', mode: 'dom' as const },
  { name: 'Lottie', relativePath: 'examples/lottie-animation/composition.html', mode: 'dom' as const },
  { name: 'Motion One', relativePath: 'examples/motion-one-animation/composition.html', mode: 'dom' as const },
  { name: 'Captions', relativePath: 'examples/captions-animation/composition.html', mode: 'dom' as const },
  { name: 'Signals', relativePath: 'examples/signals-animation/composition.html', mode: 'dom' as const },
  { name: 'Stress Test', relativePath: 'examples/stress-test-animation/composition.html', mode: 'dom' as const },
  { name: 'Dynamic Props', relativePath: 'examples/dynamic-props-animation/composition.html', mode: 'dom' as const },
  { name: 'Media Element', relativePath: 'examples/media-element-animation/composition.html', mode: 'dom' as const },
  { name: 'D3 Animation', relativePath: 'examples/d3-animation/composition.html', mode: 'dom' as const },
  { name: 'Tailwind Animation', relativePath: 'examples/tailwind-animation/composition.html', mode: 'dom' as const },
  { name: 'WAAPI Animation', relativePath: 'examples/waapi-animation/composition.html', mode: 'dom' as const },
  { name: 'Audio Visualization', relativePath: 'examples/audio-visualization/composition.html', mode: 'canvas' as const },
  { name: 'Procedural Generation', relativePath: 'examples/procedural-generation/composition.html', mode: 'canvas' as const },
  { name: 'ChartJS', relativePath: 'examples/chartjs-animation/composition.html', mode: 'dom' as const },
  { name: 'Social Media Story', relativePath: 'examples/social-media-story/composition.html', mode: 'dom' as const },
  { name: 'React Transitions', relativePath: 'examples/react-transitions/composition.html', mode: 'dom' as const },
  { name: 'React Three Fiber', relativePath: 'examples/react-three-fiber/composition.html', mode: 'canvas' as const },
  { name: 'Vue Transitions', relativePath: 'examples/vue-transitions/composition.html', mode: 'dom' as const },
  { name: 'Variable Font', relativePath: 'examples/variable-font-animation/composition.html', mode: 'dom' as const },
  { name: 'React Styled Components', relativePath: 'examples/react-styled-components/composition.html', mode: 'dom' as const },
  { name: 'Solid Canvas', relativePath: 'examples/solid-canvas-animation/composition.html', mode: 'canvas' as const },
  { name: 'Podcast Visualizer', relativePath: 'examples/podcast-visualizer/composition.html', mode: 'dom' as const },
  { name: 'Map Animation', relativePath: 'examples/map-animation/composition.html', mode: 'dom' as const },
  { name: 'Solid DOM', relativePath: 'examples/solid-dom-animation/composition.html', mode: 'dom' as const },
  { name: 'Solid Helpers', relativePath: 'examples/solid-animation-helpers/composition.html', mode: 'dom' as const },
  { name: 'Solid Transitions', relativePath: 'examples/solid-transitions/composition.html', mode: 'dom' as const },
  { name: 'Text Effects', relativePath: 'examples/text-effects-animation/composition.html', mode: 'dom' as const },
  { name: 'Promo Video', relativePath: 'examples/promo-video/composition.html', mode: 'dom' as const },
  { name: 'Web Component', relativePath: 'examples/web-component-animation/composition.html', mode: 'dom' as const },
];

async function main() {
  const filter = process.argv[2];
  console.log('Starting E2E verification render...');

  let casesToRun = CASES;
  if (filter) {
    console.log(`Filtering cases by "${filter}"...`);
    casesToRun = CASES.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
  }

  let failedCases = 0;

  for (const testCase of casesToRun) {
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
    console.log(`✅ All ${casesToRun.length} examples verified successfully!`);
    process.exit(0);
  }
}

main();
