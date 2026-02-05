import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { Renderer } from '../src/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  const fixturePath = path.resolve(__dirname, 'fixtures/dom-selector.html');
  const fixtureUrl = `file://${fixturePath}`;
  const outputDir = path.resolve(__dirname, '../../test-results/dom-selector');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Testing with fixture: ${fixtureUrl}`);

  function getResolution(filePath: string): { width: number, height: number } | null {
    try {
        const result = spawnSync('ffprobe', [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height',
            '-of', 'csv=s=x:p=0',
            filePath
        ]);
        if (result.status !== 0) return null;
        const [width, height] = result.stdout.toString().trim().split('x').map(Number);
        return { width, height };
    } catch (e) {
        return null;
    }
  }

  // Test 1: Select #target (500x500)
  console.log('\n--- Test 1: Selecting #target (Light DOM) ---');
  try {
    const renderer = new Renderer({
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 0.5,
      mode: 'dom',
      targetSelector: '#target'
    });
    const outputA = path.join(outputDir, 'output-target.mp4');
    if (fs.existsSync(outputA)) fs.unlinkSync(outputA);

    await renderer.render(fixtureUrl, outputA);

    if (fs.existsSync(outputA)) {
      console.log('✅ Test 1 Passed: output-target.mp4 created');
      const res = getResolution(outputA);
      if (res) {
          if (res.width === 500 && res.height === 500) {
              console.log('✅ Resolution verified: 500x500');
          } else {
              console.error(`❌ Resolution mismatch: Expected 500x500, got ${res.width}x${res.height}`);
              process.exit(1);
          }
      } else {
          console.warn('⚠️ Could not verify resolution (ffprobe missing?)');
      }
    } else {
      console.error('❌ Test 1 Failed: output-target.mp4 not found');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Test 1 Failed with error:', e);
    process.exit(1);
  }

  // Test 2: Select #shadow-target (300x300)
  console.log('\n--- Test 2: Selecting #shadow-target (Shadow DOM) ---');
  try {
    const renderer = new Renderer({
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 0.5,
      mode: 'dom',
      targetSelector: '#shadow-target'
    });
    const outputB = path.join(outputDir, 'output-shadow.mp4');
    if (fs.existsSync(outputB)) fs.unlinkSync(outputB);

    await renderer.render(fixtureUrl, outputB);

    if (fs.existsSync(outputB)) {
      console.log('✅ Test 2 Passed: output-shadow.mp4 created');
      const res = getResolution(outputB);
        if (res) {
            if (res.width === 300 && res.height === 300) {
                console.log('✅ Resolution verified: 300x300');
            } else {
                console.error(`❌ Resolution mismatch: Expected 300x300, got ${res.width}x${res.height}`);
                process.exit(1);
            }
        }
    } else {
      console.error('❌ Test 2 Failed: output-shadow.mp4 not found');
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
      mode: 'dom',
      targetSelector: '#missing'
    });
    const outputMissing = path.join(outputDir, 'output-missing.mp4');
    await renderer.render(fixtureUrl, outputMissing);
    console.error('❌ Test 3 Failed: Should have thrown an error but succeeded');
    process.exit(1);
  } catch (e: any) {
    const msg = e.message || '';
    if (msg.includes('Target element not found')) {
      console.log('✅ Test 3 Passed: Caught expected error:', msg);
    } else {
      console.error('❌ Test 3 Failed: Caught unexpected error:', e);
      process.exit(1);
    }
  }
}

runTest();
