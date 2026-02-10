
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { Renderer } from '../src/index';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.join(__dirname, '../../../test-results/transparent-output.webm');

// Ensure output directory exists
if (!fs.existsSync(path.dirname(OUTPUT_PATH))) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
}

// Simple transparent HTML page
const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: transparent; }
    #box {
      width: 100px;
      height: 100px;
      background: red;
      position: absolute;
      top: 50px;
      left: 50px;
    }
  </style>
</head>
<body>
  <div id="box"></div>
  <canvas id="canvas" width="1920" height="1080"></canvas>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Draw something on canvas
    function draw(time) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Semi-transparent blue background on canvas
      ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Moving circle
      ctx.fillStyle = 'yellow';
      ctx.beginPath();
      ctx.arc(200 + time * 100, 200, 50, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mock animation loop driven by Helios
    window.renderFrame = (time) => {
      draw(time);
    };
  </script>
</body>
</html>
`;

// Helper to serve the HTML as a data URL
const DATA_URL = `data:text/html;base64,${Buffer.from(HTML_CONTENT).toString('base64')}`;

async function main() {
  console.log('Starting transparency verification...');

  // Capture original console.log to inspect output
  const originalLog = console.log;
  let logOutput = '';
  console.log = (...args) => {
    logOutput += args.join(' ') + '\n';
    originalLog(...args);
  };

  try {
    const renderer = new Renderer({
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 1,
      mode: 'canvas',
      videoCodec: 'libvpx-vp9', // VP9 supports alpha
      pixelFormat: 'yuva420p',  // Request alpha
      output: OUTPUT_PATH // This is not in RendererOptions in constructor, but passed to render
    } as any);

    await renderer.render(DATA_URL, OUTPUT_PATH);

    // Verify output using ffmpeg (ffprobe behavior via -i)
    console.log('Verifying output file metadata...');
    const result = spawnSync(ffmpeg.path, ['-i', OUTPUT_PATH], { encoding: 'utf-8' });
    const stderr = result.stderr || '';

    const hasAlphaPixelFormat = stderr.includes('yuva420p') || stderr.includes('alpha_mode');
    const usedWebCodecs = logOutput.includes('with alpha: keep');
    const webCodecsMissing = logOutput.includes('WebCodecs not available');

    originalLog('\n--- Verification Results ---');
    originalLog(`Output exists: ${stderr.includes('Input #0')}`);
    originalLog(`Has Alpha (yuva420p/alpha_mode): ${hasAlphaPixelFormat}`);
    originalLog(`Used WebCodecs: ${usedWebCodecs}`);
    originalLog(`WebCodecs Missing: ${webCodecsMissing}`);

    if (hasAlphaPixelFormat) {
        if (usedWebCodecs) {
            originalLog('\n✅ VERIFICATION PASSED: WebCodecs used and alpha preserved.');
        } else if (webCodecsMissing) {
            originalLog('\n✅ VERIFICATION PASSED: Fallback used (WebCodecs missing) and alpha preserved.');
        } else {
            originalLog('\n⚠️ VERIFICATION WARNING: Alpha preserved but WebCodecs usage unclear.');
        }
    } else {
        originalLog('\n❌ VERIFICATION FAILED: Output does not have yuva420p format or alpha_mode metadata.');
        process.exit(1);
    }

  } catch (err) {
    originalLog('\n❌ VERIFICATION FAILED: Error during render.', err);
    process.exit(1);
  } finally {
    console.log = originalLog;
  }
}

main();
