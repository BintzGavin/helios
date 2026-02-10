import { Renderer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
(async () => {
  const outputDir = path.resolve(__dirname, '../output/verify-trace');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create a temporary composition
  const compositionPath = path.join(outputDir, 'composition.html');
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <canvas id="canvas" width="100" height="100"></canvas>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        function render(time) {
            ctx.fillStyle = 'blue';
            ctx.fillRect(0, 0, 100, 100);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
      </script>
    </body>
    </html>
  `;
  fs.writeFileSync(compositionPath, htmlContent);
  const compositionUrl = `file://${compositionPath}`;

  try {
    const tracePath = path.join(outputDir, 'trace.zip');

    // Clean up previous trace if any
    if (fs.existsSync(tracePath)) {
      fs.unlinkSync(tracePath);
    }

    const renderer = new Renderer({
      width: 100, height: 100, fps: 30, durationInSeconds: 1,
      mode: 'canvas'
    });

    console.log('Rendering with trace...');
    console.log('Trace path:', tracePath);

    const outputPath = path.join(outputDir, 'trace-test.mp4');

    await renderer.render(
      compositionUrl,
      outputPath,
      { tracePath }
    );

    if (fs.existsSync(tracePath)) {
      console.log('✅ Trace file created at:', tracePath);
      // Clean up
      cleanup(outputDir);
      process.exit(0);
    } else {
      console.error('❌ Trace file missing!');
      cleanup(outputDir);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error during verification:', err);
    cleanup(outputDir);
    process.exit(1);
  }
})();

function cleanup(dir: string) {
    try {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    } catch (e) {
        console.warn('Cleanup failed:', e);
    }
}
