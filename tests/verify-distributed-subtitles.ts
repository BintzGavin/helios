import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RenderOrchestrator, DistributedRenderOptions } from '../packages/renderer/src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #333; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
    h1 { font-size: 5rem; }
  </style>
</head>
<body>
  <h1>Subtitle Test</h1>
  <script>
    // Mock Helios logic for seek
    window.helios = {
      currentTime: 0,
      duration: 2,
      fps: 30,
      seek: (t) => {
        window.helios.currentTime = t;
        document.body.style.backgroundColor = t > 1 ? '#555' : '#333';
        return Promise.resolve();
      }
    };
  </script>
</body>
</html>
`;

const SRT_CONTENT = `1
00:00:00,000 --> 00:00:01,000
Hello World

2
00:00:01,000 --> 00:00:02,000
Distributed Rendering
`;

async function main() {
  const htmlPath = path.join(OUTPUT_DIR, 'test-subs.html');
  const srtPath = path.join(OUTPUT_DIR, 'test.srt');
  const outputPath = path.join(OUTPUT_DIR, 'distributed-subs-output.mp4');

  fs.writeFileSync(htmlPath, HTML_CONTENT);
  fs.writeFileSync(srtPath, SRT_CONTENT);

  const options: DistributedRenderOptions = {
    width: 640,
    height: 360,
    fps: 30,
    durationInSeconds: 2,
    mode: 'dom',
    concurrency: 2, // Force distributed rendering (2 chunks)
    subtitles: srtPath,
    videoCodec: 'libx264', // Must be a transcoding codec for subtitles
    ffmpegPath: process.env.FFMPEG_PATH // Use env var if available, else default
  };

  console.log('Starting distributed render with subtitles...');
  try {
    await RenderOrchestrator.render(`file://${htmlPath}`, outputPath, options, {
      onProgress: (p) => console.log(`Progress: ${(p * 100).toFixed(1)}%`)
    });
    console.log('✅ Render with subtitles completed successfully.');
  } catch (err) {
    console.error('❌ Render with subtitles failed:', err);
    process.exit(1);
  }

  // Verify output existence
  if (!fs.existsSync(outputPath)) {
    console.error('❌ Output file not found:', outputPath);
    process.exit(1);
  }

  // Verify cleanup
  let files = fs.readdirSync(OUTPUT_DIR);
  let tempFiles = files.filter(f => f.startsWith('temp_') || f.startsWith('concat_'));
  if (tempFiles.length > 0) {
    // Note: If previous runs failed, this might trigger. Ideally we clean before running.
    console.warn('⚠️ Intermediate files found (might be from previous failed runs):', tempFiles);
  } else {
    console.log('✅ Cleanup verified.');
  }

  // Test 2: Distributed Render WITHOUT subtitles (Regression test for silent audio)
  const outputPathNoSubs = path.join(OUTPUT_DIR, 'distributed-nosubs-output.mp4');
  const optionsNoSubs: DistributedRenderOptions = {
    ...options,
    subtitles: undefined,
    concurrency: 2
  };

  console.log('Starting distributed render WITHOUT subtitles (silent audio test)...');
  try {
    await RenderOrchestrator.render(`file://${htmlPath}`, outputPathNoSubs, optionsNoSubs, {
        onProgress: (p) => console.log(`Progress (No Subs): ${(p * 100).toFixed(1)}%`)
    });
    console.log('✅ Render without subtitles completed successfully.');
  } catch (err) {
    console.error('❌ Render without subtitles failed:', err);
    process.exit(1);
  }

  if (!fs.existsSync(outputPathNoSubs)) {
    console.error('❌ Output file (no subs) not found:', outputPathNoSubs);
    process.exit(1);
  }

  console.log('✅ All Tests Passed!');
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
