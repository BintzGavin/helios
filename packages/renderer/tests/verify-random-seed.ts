import { Renderer } from '../src/index.js';
import path from 'path';
import fs from 'fs';

const OUTPUT_DIR = path.join(process.cwd(), 'test-results');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// A simple HTML that logs Math.random() on load
const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<body>
  <script>
    // Log multiple values to ensure the sequence is deterministic
    console.log('Random Value: ' + Math.random());
    console.log('Random Value 2: ' + Math.random());
    console.log('Random Value 3: ' + Math.random());
  </script>
</body>
</html>
`;

const COMPOSITION_URL = `data:text/html;base64,${Buffer.from(HTML_CONTENT).toString('base64')}`;

async function runTest() {
  console.log('Starting Random Seed Verification...');

  const logs: Record<string, string[]> = {};

  const captureLogs = async (seed: number | undefined, key: string) => {
    console.log(`\nRendering with seed: ${seed} (Key: ${key})`);

    const capturedLines: string[] = [];
    const originalLog = console.log;

    // Intercept console.log to capture page output
    console.log = (...args) => {
      const msg = args.join(' ');
      if (msg.includes('PAGE LOG: Random Value')) {
        capturedLines.push(msg);
      }
      originalLog(...args);
    };

    const renderer = new Renderer({
      width: 100,
      height: 100,
      fps: 30,
      durationInSeconds: 1.0, // Longer duration to allow FFmpeg probing
      mode: 'dom', // Use DOM mode
      randomSeed: seed,
      intermediateImageFormat: 'png',
    });

    try {
      await renderer.render(
        COMPOSITION_URL,
        path.join(OUTPUT_DIR, `verify-seed-${key}.mp4`)
      );
    } finally {
      console.log = originalLog;
    }

    logs[key] = capturedLines;
  };

  // Run 1: Seed A (123)
  await captureLogs(123, 'run1');

  // Run 2: Seed B (456)
  await captureLogs(456, 'run2');

  // Run 3: Seed A (123) again
  await captureLogs(123, 'run3');

  // Verification
  console.log('\n--- Results ---');
  console.log('Run 1 Logs:', logs['run1']);
  console.log('Run 2 Logs:', logs['run2']);
  console.log('Run 3 Logs:', logs['run3']);

  // Assertions
  if (logs['run1'].length === 0) {
    throw new Error('Failed to capture random values from page.');
  }

  // Check determinism (Run 1 == Run 3)
  const run1Str = JSON.stringify(logs['run1']);
  const run3Str = JSON.stringify(logs['run3']);
  if (run1Str !== run3Str) {
    throw new Error(`Determinism Failed: Run 1 and Run 3 should match.\nRun 1: ${run1Str}\nRun 3: ${run3Str}`);
  }
  console.log('✅ Determinism verified (Seed 123 produces consistent results).');

  // Check variance (Run 1 != Run 2)
  const run2Str = JSON.stringify(logs['run2']);
  if (run1Str === run2Str) {
    throw new Error(`Variance Failed: Run 1 and Run 2 should differ.\nRun 1: ${run1Str}\nRun 2: ${run2Str}`);
  }
  console.log('✅ Variance verified (Seed 123 differs from Seed 456).');

  console.log('Test Passed!');
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
