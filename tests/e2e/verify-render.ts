import { Renderer } from '../../packages/renderer/dist/index.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const execFileAsync = promisify(execFile);
const ffmpegPath = ffmpeg.path;

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
  'react-audio-visualization',
  'vue-audio-visualization',
  'vue-canvas-animation',
  'svelte-canvas-animation',
  'solid-canvas-animation'
]);

const DURATION_OVERRIDES: Record<string, number> = {
  'promo-video': 15
};

const YMAX_THRESHOLD_OVERRIDES: Record<string, number> = {
  'promo-video': 150
};

// Helper to format name: "simple-animation" -> "Simple Animation"
function formatName(dirName: string) {
  return dirName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function verifyVideoContent(filePath: string, expectedDuration: number, minYmax: number = 0) {
  try {
    // 1. Check Metadata using ffmpeg -i
    // ffmpeg -i usually returns exit code 1 if no output file, but prints info to stderr
    let stderr = '';
    try {
      await execFileAsync(ffmpegPath, ['-i', filePath]);
    } catch (e: any) {
      stderr = e.stderr || '';
    }

    // Parse Duration
    const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (!durationMatch) {
      // If we can't find Duration in stderr, it might be a valid file but ffmpeg output format changed?
      // Or the file is corrupted.
      throw new Error('Could not parse duration from ffmpeg output. File might be invalid.');
    }
    const [_, h, m, s] = durationMatch;
    const actualDuration = parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s);

    if (Math.abs(actualDuration - expectedDuration) > 1.0) {
      throw new Error(`Duration mismatch: expected ${expectedDuration}s, got ${actualDuration}s`);
    }

    // Parse Video Stream
    if (!stderr.includes('Video:')) {
      throw new Error('No video stream found');
    }

    // 2. Check Content (Non-Black) using signalstats
    const midPoint = expectedDuration / 2;
    const { stdout, stderr: statsStderr } = await execFileAsync(ffmpegPath, [
      '-ss', midPoint.toString(),
      '-i', filePath,
      '-vframes', '1',
      '-vf', 'signalstats,metadata=mode=print:key=lavfi.signalstats.YMAX',
      '-f', 'null',
      '-'
    ]);

    // Metadata is printed to stderr by default
    const output = stdout + statsStderr;
    const ymaxMatch = output.match(/lavfi\.signalstats\.YMAX=([0-9.]+)/);

    if (!ymaxMatch) {
      console.log('--- FFmpeg STDOUT ---');
      console.log(stdout);
      console.log('--- FFmpeg STDERR ---');
      console.log(statsStderr);
      throw new Error('Could not retrieve signalstats YMAX');
    }

    const ymax = parseFloat(ymaxMatch[1]);
    if (ymax <= minYmax) {
      throw new Error(`Video frame at ${midPoint}s is too dark (YMAX=${ymax}, expected > ${minYmax})`);
    }

    console.log(`   Content verified: Duration=${actualDuration.toFixed(2)}s, YMAX=${ymax}`);

  } catch (err: any) {
    throw new Error(`Verification failed: ${err.message}`);
  }
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

    // Check for overrides
    const dirName = testCase.relativePath.split('/')[1];
    const duration = DURATION_OVERRIDES[dirName] || 5;
    const minYmax = YMAX_THRESHOLD_OVERRIDES[dirName] || 0;

    // Create a new renderer for each case to ensure clean state
    const renderer = new Renderer({
      width: 600,
      height: 600,
      fps: 30,
      durationInSeconds: duration,
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

      // Verify content
      await verifyVideoContent(outputPath, duration, minYmax);

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
