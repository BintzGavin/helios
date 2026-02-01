import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Renderer } from '../src/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  const fixturePath = path.resolve(__dirname, 'fixtures/multi-canvas.html');
  const fixtureUrl = `file://${fixturePath}`;
  const outputDir = path.resolve(__dirname, '../../test-results/canvas-selector');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Testing with fixture: ${fixtureUrl}`);

  // Test 1: Select Canvas A
  console.log('\n--- Test 1: Selecting #canvas-a ---');
  try {
    const renderer = new Renderer({
      width: 100,
      height: 100,
      fps: 30,
      durationInSeconds: 0.5,
      mode: 'canvas',
      canvasSelector: '#canvas-a'
    });
    const outputA = path.join(outputDir, 'output-a.mp4');
    if (fs.existsSync(outputA)) fs.unlinkSync(outputA);

    await renderer.render(fixtureUrl, outputA);

    if (fs.existsSync(outputA)) {
      console.log('✅ Test 1 Passed: output-a.mp4 created');
    } else {
      console.error('❌ Test 1 Failed: output-a.mp4 not found');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Test 1 Failed with error:', e);
    process.exit(1);
  }

  // Test 2: Select Canvas B
  console.log('\n--- Test 2: Selecting #canvas-b ---');
  try {
    const renderer = new Renderer({
      width: 100,
      height: 100,
      fps: 30,
      durationInSeconds: 0.5,
      mode: 'canvas',
      canvasSelector: '#canvas-b'
    });
    const outputB = path.join(outputDir, 'output-b.mp4');
    if (fs.existsSync(outputB)) fs.unlinkSync(outputB);

    await renderer.render(fixtureUrl, outputB);

    if (fs.existsSync(outputB)) {
      console.log('✅ Test 2 Passed: output-b.mp4 created');
    } else {
      console.error('❌ Test 2 Failed: output-b.mp4 not found');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Test 2 Failed with error:', e);
    process.exit(1);
  }

  // Test 3: Missing Selector
  console.log('\n--- Test 3: Selecting #missing ---');
  try {
    const renderer = new Renderer({
      width: 100,
      height: 100,
      fps: 30,
      durationInSeconds: 0.5,
      mode: 'canvas',
      canvasSelector: '#missing'
    });
    const outputMissing = path.join(outputDir, 'output-missing.mp4');
    await renderer.render(fixtureUrl, outputMissing);
    console.error('❌ Test 3 Failed: Should have thrown an error but succeeded');
    process.exit(1);
  } catch (e: any) {
    // We expect the error to come from the capture method or page error
    const msg = e.message || '';
    if (msg.includes('Canvas not found') || msg.includes('Could not find canvas') || msg.includes('CanvasStrategy: Could not find canvas')) {
      console.log('✅ Test 3 Passed: Caught expected error:', msg);
    } else {
      console.error('❌ Test 3 Failed: Caught unexpected error:', e);
      process.exit(1);
    }
  }
}

runTest();
