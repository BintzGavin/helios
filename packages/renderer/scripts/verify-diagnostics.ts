import { Renderer } from '../src/index';

async function main() {
  console.log('Starting diagnostics verification...');

  // 1. Verify Canvas Strategy Diagnostics
  console.log('\n--- Testing Canvas Strategy Diagnostics ---');
  const canvasRenderer = new Renderer({
    width: 100,
    height: 100,
    fps: 1,
    durationInSeconds: 1, // Short render
  });

  // Simple HTML with a canvas
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body>
        <canvas width="100" height="100"></canvas>
        <script>
          const canvas = document.querySelector('canvas');
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = 'red';
          ctx.fillRect(0, 0, 100, 100);
        </script>
      </body>
    </html>
  `;
  const dataUrl = `data:text/html;base64,${Buffer.from(htmlContent).toString('base64')}`;

  try {
    // We expect this to run and print diagnostics
    // Using a dummy output path
    await canvasRenderer.render(dataUrl, 'output/diagnostics-canvas.mp4');
    console.log('Canvas render completed.');
  } catch (e) {
    console.error('Canvas render failed (this is okay if diagnostics printed):', e);
  }

  // 2. Verify DOM Strategy Diagnostics
  console.log('\n--- Testing DOM Strategy Diagnostics ---');
  const domRenderer = new Renderer({
    width: 100,
    height: 100,
    fps: 1,
    durationInSeconds: 1,
    mode: 'dom'
  });

  try {
    await domRenderer.render(dataUrl, 'output/diagnostics-dom.mp4');
    console.log('DOM render completed.');
  } catch (e) {
    console.error('DOM render failed (this is okay if diagnostics printed):', e);
  }

  console.log('\n-----------------------------------------------------------');
  console.log('VERIFICATION: Check above logs for "[Helios Diagnostics]" lines.');
  console.log('-----------------------------------------------------------');
}

main();
