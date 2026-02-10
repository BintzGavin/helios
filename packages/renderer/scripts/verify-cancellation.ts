import { Renderer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function main() {
  const outputDir = path.resolve(__dirname, '../output/verify-cancellation');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create a temporary composition
  const compositionPath = path.join(outputDir, 'composition.html');
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <canvas id="canvas" width="1280" height="720"></canvas>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        function render(time) {
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, 1280, 720);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
      </script>
    </body>
    </html>
  `;
  fs.writeFileSync(compositionPath, htmlContent);
  const compositionUrl = `file://${compositionPath}`;

  const outputPath = path.join(outputDir, 'cancellation-test.mp4');

  console.log(`Target composition: ${compositionUrl}`);

  const renderer = new Renderer({
    width: 1280,
    height: 720,
    fps: 30,
    durationInSeconds: 10, // Long enough to ensure we can abort
    mode: 'canvas'
  });

  const controller = new AbortController();
  const signal = controller.signal;

  console.log('Starting render with cancellation scheduled in 2 seconds...');

  setTimeout(() => {
    console.log('Aborting render now!');
    controller.abort();
  }, 2000);

  try {
    await renderer.render(compositionUrl, outputPath, {
      signal,
      onProgress: (p) => {
        console.log(`Progress callback: ${(p * 100).toFixed(1)}%`);
      }
    });
    console.error('Test Failed: Render completed despite cancellation.');
    // Cleanup on failure too
    cleanup(outputDir);
    process.exit(1);
  } catch (err: any) {
    if (err.message === 'Aborted') {
      console.log('Test Passed: Render was successfully aborted.');
      cleanup(outputDir);
      process.exit(0);
    } else {
      console.error('Test Failed: Unexpected error:', err);
      cleanup(outputDir);
      process.exit(1);
    }
  }
}

function cleanup(dir: string) {
    try {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    } catch (e) {
        console.warn('Cleanup failed:', e);
    }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
