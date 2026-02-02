import { RenderOrchestrator } from '../src/index.js';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('Starting Distributed Rendering Verification...');

  const duration = 2.0; // 2 seconds, 60 frames at 30fps
  const fps = 30;
  const width = 600;
  const height = 600;

  // Minimal Composition
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0; overflow:hidden;">
<canvas id="c"></canvas>
<script>
  const canvas = document.getElementById('c');
  canvas.width = ${width};
  canvas.height = ${height};
  const ctx = canvas.getContext('2d');

  // Basic animation loop
  function render(time) {
      // time is in ms
      const frame = Math.floor(time / (1000 / ${fps}));

      // Visual pattern that changes every frame to detect dropped/duplicate frames
      ctx.fillStyle = frame % 2 === 0 ? 'blue' : 'green';
      ctx.fillRect(0, 0, ${width}, ${height});

      ctx.fillStyle = 'white';
      ctx.font = '40px Arial';
      ctx.fillText('Frame: ' + frame, 50, 300);

      // Progress bar
      const progress = frame / (${duration * fps});
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 500, ${width} * progress, 50);
  }

  let startTime = null;
  function loop(t) {
      if (!startTime) startTime = t;
      render(t - startTime);
      requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
</script>
</body>
</html>
  `;

  const compositionUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  const outputPath = path.resolve(__dirname, 'test-distributed-output.mp4');

  // Clean up previous runs
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

  try {
    console.log('Orchestrating Distributed Render (Concurrency: 2)...');

    await RenderOrchestrator.render(compositionUrl, outputPath, {
      width,
      height,
      fps,
      durationInSeconds: duration,
      mode: 'canvas',
      concurrency: 2, // Split into 2 chunks (1 second each)
      // Use defaults for codecs
    });

    if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 0) {
            console.log(`✅ Verification Passed! Distributed render output saved to: ${outputPath} (${stats.size} bytes)`);

            // Clean up
            fs.unlinkSync(outputPath);
            process.exit(0);
        } else {
             console.error(`❌ Verification Failed: Output file is empty.`);
             process.exit(1);
        }
    } else {
        console.error(`❌ Verification Failed: Output file was not created.`);
        process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Verification Failed:`, error);
    process.exit(1);
  }
}

main();
