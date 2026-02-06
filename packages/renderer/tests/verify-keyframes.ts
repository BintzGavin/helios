
import { Renderer } from '../src/index.js';
import path from 'path';
import fs from 'fs';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

async function main() {
  const outputPath = path.resolve(__dirname, 'test-keyframes.mp4');
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  try {

  const html = `
    <!DOCTYPE html>
    <html>
    <body>
    <canvas id="canvas" width="640" height="360"></canvas>
    <script>
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 640, 360);
    </script>
    </body>
    </html>
  `;
  const compositionUrl = 'data:text/html,' + encodeURIComponent(html);

  const fps = 30;
  const duration = 4; // 120 frames
  const keyFrameInterval = 30; // Expect keyframe every 1 second (0, 30, 60, 90)

  console.log('Rendering with Mock VideoEncoder...');

  // Custom props to signal the mock to record keyframes
  const inputProps = {
     __MOCK_RECORDING__: true
  };

  const renderer = new Renderer({
    width: 640,
    height: 360,
    fps,
    durationInSeconds: duration,
    mode: 'canvas',
    videoCodec: 'copy',
    intermediateVideoCodec: 'h264', // This triggers the strategy to LOOK for WebCodecs
    keyFrameInterval: keyFrameInterval,
    ffmpegPath: ffmpeg.path,
    inputProps,
    browserConfig: {
        args: [
            '--disable-web-security',
            '--allow-file-access-from-files'
        ]
    }
  });

  // Access the internal strategy to inject the mock?
  // Renderer doesn't expose strategy or page.
  // But we can use `inputProps` to communicate? No, inputProps are just window vars.
  // We can use the fact that `Renderer` calls `addInitScript` with `inputProps`.
  // Wait, `addInitScript` sets `window.__HELIOS_PROPS__`.

  // We can't easily inject the mock from here because Renderer manages the browser.
  // BUT, we can inject the mock in the HTML itself!
  // And we need the mock to be present BEFORE `CanvasStrategy.diagnose` checks for it.

  // Let's modify the HTML to include the Mock VideoEncoder.
  const mockScript = `
    window.VideoEncoder = class MockVideoEncoder {
        static isConfigSupported(config) {
            return Promise.resolve({
                supported: true,
                type: 'hardware', // Simulate hardware to ensure selection
                config
            });
        }

        constructor(init) {
            this.output = init.output;
            this.error = init.error;
            this.state = 'configured';
            this.encodeHistory = [];
            window.__MOCK_ENCODER__ = this;
        }

        configure(config) {
            this.config = config;
        }

        encode(frame, options) {
            this.encodeHistory.push({
                timestamp: frame.timestamp,
                keyFrame: options.keyFrame
            });

            // Produce a fake chunk so the renderer doesn't hang or empty
            const chunk = new ArrayBuffer(100);
            const encodedChunk = {
                type: options.keyFrame ? 'key' : 'delta',
                timestamp: frame.timestamp,
                duration: 0,
                byteLength: 100,
                copyTo: (dest) => {}
            };

            // Async output
            setTimeout(() => {
                 this.output(encodedChunk, {});
            }, 0);
        }

        flush() {
            return Promise.resolve();
        }

        close() {}
    };

    // Also mock MediaCapabilities
    navigator.mediaCapabilities = {
        encodingInfo: (config) => Promise.resolve({ supported: true, smooth: true, powerEfficient: true })
    };
  `;

  const mockedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
    <script>
    ${mockScript}
    </script>
    </head>
    <body>
    <canvas id="canvas" width="640" height="360"></canvas>
    <script>
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 640, 360);
    </script>
    </body>
    </html>
  `;

  const mockedCompositionUrl = 'data:text/html,' + encodeURIComponent(mockedHtml);

  // We need to capture the `encodeHistory` from the browser context after render.
  // BUT `Renderer.render` closes the page.
  // So we can't inspect it afterwards.

  // However, we can use `console.log` in the mock to print to stdout, which `Renderer` pipes to stdout.
  // We can intercept stdout/console logs.

  const originalLog = console.log;
  const capturedLogs: string[] = [];
  console.log = (...args) => {
      const msg = args.join(' ');
      capturedLogs.push(msg);
      originalLog(...args); // Keep printing
  };

  // Update mock to log
  const loggingMockScript = mockScript.replace(
      'this.encodeHistory.push({',
      'console.log("MOCK_ENCODE: " + JSON.stringify({ timestamp: frame.timestamp, keyFrame: options.keyFrame })); this.encodeHistory.push({'
  );

  const finalHtml = mockedHtml.replace(mockScript, loggingMockScript);
  const finalUrl = 'data:text/html,' + encodeURIComponent(finalHtml);

  try {
      await renderer.render(finalUrl, outputPath);
  } catch (e) {
      // It might fail on ffmpeg if input is garbage, but we care about the logs.
      console.log('Render finished (possibly with error, ignoring):', e.message);
  }

  console.log = originalLog; // Restore

  // Analyze logs
  const encodes = capturedLogs
      .filter(l => l.includes('MOCK_ENCODE:'))
      .map(l => {
          const json = l.split('MOCK_ENCODE: ')[1];
          return JSON.parse(json);
      });

  console.log(`Captured ${encodes.length} encodes.`);

  if (encodes.length === 0) {
      throw new Error('FAILED: No mock encodes captured. Mock injection failed or strategy did not use VideoEncoder.');
  }

  const keyFrames = encodes.filter(e => e.keyFrame).map(e => Math.round(e.timestamp / 1000000 * fps));
  console.log('Keyframes found at frame indices:', keyFrames);

  const expected = [0, 30, 60, 90];
  const missing = expected.filter(e => !keyFrames.includes(e));

  if (missing.length > 0) {
      throw new Error(`FAILED: Missing expected keyframes at: ${missing.join(', ')}`);
  }

  console.log('SUCCESS: Mock verification passed.');
  } finally {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
