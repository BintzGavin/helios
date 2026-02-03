import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Renderer } from '../src/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  const fixturePath = path.resolve(__dirname, 'fixtures/shadow-canvas.html');
  const fixtureUrl = `file://${fixturePath}`;
  const outputDir = path.resolve(__dirname, '../../test-results/canvas-shadow-dom');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'output.mp4');
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

  console.log(`Testing with fixture: ${fixtureUrl}`);
  console.log('Attempts to find canvas #gl inside Shadow DOM...');

  try {
    const renderer = new Renderer({
      width: 200,
      height: 200,
      fps: 30,
      durationInSeconds: 1, // 30 frames
      mode: 'canvas',
      canvasSelector: '#gl' // This is inside Shadow DOM
    });

    await renderer.render(fixtureUrl, outputPath);

    if (fs.existsSync(outputPath)) {
      console.log('✅ Test Passed: Output file created successfully.');
    } else {
      console.error('❌ Test Failed: Output file not found.');
      process.exit(1);
    }

  } catch (e: any) {
    console.error('❌ Test Failed with error:', e);
    // Expected to fail BEFORE the fix
    if (e.message.includes('Canvas not found') || e.message.includes('Could not find canvas') || e.message.includes('CanvasStrategy: Could not find canvas')) {
        console.log('(This failure is expected before the fix)');
    }
    process.exit(1);
  }
}

runTest();
