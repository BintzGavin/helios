import { Renderer } from '../src/index';
import { RendererOptions } from '../src/types';
import fs from 'fs';
import path from 'path';

const TEST_VIDEO_URL = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

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

async function run() {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

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
    // Check for the expected log message structure from the Renderer
    if (msg.includes('PAGE LOG: [DomStrategy] Preloading') && msg.includes('media elements')) {
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
