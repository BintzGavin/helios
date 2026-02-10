import { Renderer } from '../src/index';
import { RendererOptions } from '../src/types';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function run() {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Generate dummy video locally to avoid network flakiness/errors
  const dummyVideoPath = path.join(tempDir, 'dummy-preload.mp4');
  if (!fs.existsSync(dummyVideoPath)) {
    console.log('Generating dummy video for test...');
    spawnSync(ffmpeg.path, [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=duration=5:size=1280x720:rate=30',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=5',
      '-c:v', 'libx264', '-c:a', 'aac',
      dummyVideoPath
    ]);
  }
  const TEST_VIDEO_URL = `file://${dummyVideoPath}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Media Preload Test</title>
  <style>
    body { margin: 0; padding: 0; background: black; }
    video { width: 1280px; height: 720px; }
  </style>
</head>
<body>
  <video src="${TEST_VIDEO_URL}" muted loop></video>
  <script>
    console.log('Page loaded');
  </script>
</body>
</html>
`;

  const htmlPath = path.join(tempDir, 'media-preload-test.html');
  // Need absolute path for file://
  const absoluteHtmlPath = path.resolve(htmlPath);
  fs.writeFileSync(htmlPath, htmlContent);

  const outputPath = path.join(tempDir, 'media-preload-output.mp4');

  const options: RendererOptions = {
    fps: 30,
    durationInSeconds: 2,
    width: 1280,
    height: 720,
    mode: 'dom',
  };

  const renderer = new Renderer(options);

  // Hook into console logs to verify preloading messages
  const originalLog = console.log;
  let preloadDetected = false;

  console.log = (...args) => {
    const msg = args.join(' ');
    originalLog(msg);
    // Check for the expected log message structure from the Renderer (now from DomScanner)
    // Looking for "PAGE LOG: [DomScanner] Found 1 media elements. Waiting for readiness..."
    // or "[DomScanner] Media elements ready."
    if (msg.includes('[DomScanner]') && msg.includes('Found') && msg.includes('media elements')) {
      preloadDetected = true;
    }
  };

  try {
    console.log('Starting render...');
    await renderer.render(`file://${absoluteHtmlPath}`, outputPath);
    console.log('Render complete.');
  } catch (err) {
    console.error('Render failed:', err);
    process.exit(1);
  } finally {
    console.log = originalLog;
  }

  if (preloadDetected) {
    console.log('✅ SUCCESS: Media preloading detected.');
  } else {
    console.error('❌ FAILURE: Media preloading NOT detected.');
    process.exit(1);
  }
}

run();
