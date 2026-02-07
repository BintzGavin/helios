import { Renderer } from '../src/index.js';
import path from 'path';
import fs from 'fs';

const OUTPUT_PATH = path.join(process.cwd(), 'verify-hwaccel-output.mp4');

// Minimal composition
const COMPOSITION = `data:text/html;base64,PCFET0NUWVBFIGh0bWw+CjxodG1sPgo8aGVhZD4KICA8c3R5bGU+Ym9keSB7IGJhY2tncm91bmQ6IHJlZDsgfTwvc3R5bGU+CjwvaGVhZD4KPGJvZHk+CiAgPGgxPkhXIEFjY2VsIFRlc3Q8L2gxPgo8L2JvZHk+CjwvaHRtbD4=`;

async function run() {
  console.log('Verifying Hardware Acceleration Validation...');

  const renderer = new Renderer({
    mode: 'canvas',
    width: 100,
    height: 100,
    fps: 1,
    durationInSeconds: 1,
    hwAccel: 'fake-accel-9999', // Invalid accel
  });

  // Spy on console.warn
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const msg = args.join(' ');
    // Only capture our specific warnings to avoid noise
    if (msg.includes('[Helios Warning]')) {
      warnings.push(msg);
    }
    originalWarn(...args);
  };

  try {
    // We expect this to fail or at least run, but validation happens before spawn.
    // If we pass an invalid hwAccel to ffmpeg, it might fail.
    // But our validation is purely logging a warning.
    // The Renderer passes options.hwAccel to getFFmpegArgs -> then to spawn.
    // If 'fake-accel-9999' is passed to ffmpeg -hwaccel, ffmpeg will error out.
    // So we expect a failure.
    await renderer.render(COMPOSITION, OUTPUT_PATH);
  } catch (err: any) {
    console.log('Render failed as expected (FFmpeg likely rejected invalid hwaccel).');
  } finally {
    console.warn = originalWarn; // Restore
    if (fs.existsSync(OUTPUT_PATH)) {
      fs.unlinkSync(OUTPUT_PATH);
    }
  }

  // Assert
  const expectedWarningPart = "Hardware acceleration 'fake-accel-9999' was requested but is not listed";
  const found = warnings.some(w => w.includes(expectedWarningPart));

  if (found) {
    console.log('✅ Validation Passed: Warning was logged.');
    console.log('Captured warning:', warnings.find(w => w.includes(expectedWarningPart)));
  } else {
    console.error('❌ Validation Failed: Warning was NOT logged.');
    console.error('Captured warnings:', warnings);
    process.exit(1);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
