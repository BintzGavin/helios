import { Renderer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync, rmSync } from 'fs';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function main() {
  console.log('Starting FFmpeg path verification script...');

  const outputDir = path.resolve(__dirname, '../output/verify-ffmpeg');
  await fs.mkdir(outputDir, { recursive: true });

  const compositionPath = path.resolve(outputDir, 'composition.html');
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <canvas id="canvas" width="100" height="100"></canvas>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 100, 100);
      </script>
    </body>
    </html>
  `;
  await fs.writeFile(compositionPath, htmlContent);
  const compositionUrl = `file://${compositionPath}`;
  const outputPath = path.resolve(outputDir, 'output.mp4');

  // 1. Negative Test: Invalid Path
  console.log('\n--- Test 1: Invalid FFmpeg Path ---');
  const invalidPath = '/path/to/non/existent/ffmpeg_binary';
  const rendererInvalid = new Renderer({
    width: 100,
    height: 100,
    fps: 30,
    durationInSeconds: 0.1, // Short duration
    mode: 'canvas',
    ffmpegPath: invalidPath
  });

  let capturedError: any = null;
  try {
    console.log('Attempting render with invalid path...');
    await rendererInvalid.render(compositionUrl, outputPath);
    console.log('Render finished unexpectedly (should have failed).');
  } catch (error: any) {
    console.log('Caught expected error in script.');
    capturedError = error;
  }

  if (capturedError) {
      console.log('Captured Error Message:', capturedError.message);
      if (capturedError.code === 'ENOENT' || capturedError.message.includes('ENOENT') || capturedError.message.includes('spawn')) {
        console.log('✅ Passed: Render failed as expected with invalid path.');
      } else {
        console.error('❌ Failed: Expected ENOENT/spawn error for invalid path, got:', capturedError);
        cleanup(outputDir);
        process.exit(1);
      }
  } else {
      console.error('❌ Failed: No error was caught!');
      cleanup(outputDir);
      process.exit(1);
  }

  // 2. Positive Test: Valid Path (Explicit)
  console.log('\n--- Test 2: Valid FFmpeg Path (Explicit) ---');
  const validPath = ffmpeg.path;
  const rendererValid = new Renderer({
    width: 100,
    height: 100,
    fps: 30,
    durationInSeconds: 0.1,
    mode: 'canvas',
    ffmpegPath: validPath
  });

  try {
    await rendererValid.render(compositionUrl, outputPath);
    console.log('✅ Passed: Render succeeded with valid explicit path.');
  } catch (error) {
    console.error('❌ Failed: Valid path render failed:', error);
    cleanup(outputDir);
    process.exit(1);
  }

  console.log('\n🎉 Verification successful!');
  cleanup(outputDir);
}

function cleanup(dir: string) {
    try {
        if (existsSync(dir)) {
            rmSync(dir, { recursive: true, force: true });
        }
    } catch (e) {
        console.warn('Cleanup failed:', e);
    }
}

main().catch(err => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
