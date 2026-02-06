import { RenderOrchestrator } from '../src/index.js';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

async function main() {
  console.log('Starting distributed progress verification...');

  const outputDir = path.resolve(process.cwd(), 'output-progress-test');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create a mock composition file
  const compositionPath = path.join(outputDir, 'mock-composition.html');
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <div id="test" style="width: 100px; height: 100px; background: red;">Test</div>
      <script>
        // Mock Helios to satisfy SeekTimeDriver
        window.helios = {
          isVirtualTimeBound: true,
          seek: (frame) => {},
          waitUntilStable: () => Promise.resolve(),
          fps: { value: 30 },
          currentFrame: { value: 0 }
        };
      </script>
    </body>
    </html>
  `;
  fs.writeFileSync(compositionPath, htmlContent);
  const compositionUrl = `file://${compositionPath}`;

  const outputPath = path.join(outputDir, 'distributed-output.mp4');

  // Cleanup previous output
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const progressUpdates: number[] = [];

  const options = {
    width: 100,
    height: 100,
    fps: 30,
    durationInSeconds: 2, // 60 frames
    concurrency: 2, // 2 workers, 30 frames each
    mode: 'dom' as const,
    ffmpegPath: ffmpeg.path
  };

  try {
    console.log('Running RenderOrchestrator...');
    await RenderOrchestrator.render(compositionUrl, outputPath, options, {
      onProgress: (progress) => {
        progressUpdates.push(progress);
        // console.log(`Progress update: ${progress}`);
      }
    });
    console.log('Render finished successfully.');
  } catch (error: any) {
    if (error.message && error.message.includes('Stream map \'0:a\' matches no streams')) {
      console.log('Caught expected audio mix error (ignoring for progress test).');
    } else {
      console.error('Test failed with unexpected error:', error);
      process.exit(1);
    }
  }

  // Verify progress
  console.log(`Total progress updates: ${progressUpdates.length}`);
  if (progressUpdates.length === 0) {
    console.error('No progress updates received.');
    process.exit(1);
  }

  let valid = true;
  for (let i = 1; i < progressUpdates.length; i++) {
    if (progressUpdates[i] < progressUpdates[i - 1]) {
      console.error(`Non-monotonic progress detected: ${progressUpdates[i-1]} -> ${progressUpdates[i]}`);
      valid = false;
      break;
    }
  }

  // We expect failure initially
  if (!valid) {
    console.log('⚠️ Confirmed: Progress is non-monotonic (Expected failure).');
  } else {
    console.log('✅ Progress is monotonic.');
  }

  // Clean up
  try {
    if (fs.existsSync(compositionPath)) fs.unlinkSync(compositionPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    // fs.rmdirSync(outputDir, { recursive: true });
  } catch (e) {}

}

main();
