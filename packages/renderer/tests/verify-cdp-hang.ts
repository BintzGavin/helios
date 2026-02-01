import { Renderer } from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function runTest() {
  console.log('Running CDP Hang Verification...');

  const tempHtmlPath = path.join(os.tmpdir(), 'cdp-hang-test.html');
  const outputVideoPath = path.join(os.tmpdir(), 'cdp-hang-output.mp4');

  // Minimal valid WAV file
  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + 4000, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(1, 22);
  wavHeader.writeUInt32LE(8000, 24);
  wavHeader.writeUInt32LE(8000, 28);
  wavHeader.writeUInt16LE(1, 32);
  wavHeader.writeUInt16LE(8, 34);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(4000, 40);
  const pcmData = Buffer.alloc(4000, 128);
  const wavFile = Buffer.concat([wavHeader, pcmData]);
  const wavBase64 = wavFile.toString('base64');
  const dataUri = `data:audio/wav;base64,${wavBase64}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <canvas id="canvas" width="640" height="360"></canvas>
      <!-- We use preload="none" to ensure it doesn't load until we interact with it -->
      <!-- But DomScanner interacts with it. -->
      <audio id="audio" src="${dataUri}" preload="none"></audio>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, 640, 360);
      </script>
    </body>
    </html>
  `;

  fs.writeFileSync(tempHtmlPath, htmlContent);

  const renderer = new Renderer({
    width: 640,
    height: 360,
    fps: 30,
    durationInSeconds: 1,
    mode: 'canvas',
    stabilityTimeout: 5000, // Short timeout for test
  });

  try {
    console.log('Starting render (should hang/timeout if bug exists)...');

    // We expect this to potentially hang or timeout if the bug exists.
    const renderPromise = renderer.render('file://' + tempHtmlPath, outputVideoPath);

    // Create a timeout that rejects
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test Timeout')), 10000);
    });

    await Promise.race([renderPromise, timeoutPromise]);

    console.log('✅ Render completed successfully.');
  } catch (e: any) {
    if (e.message === 'Test Timeout') {
        console.error('❌ Test timed out! CDP Hang reproduced.');
        process.exit(1);
    }
    console.error('❌ Test failed with error:', e);
    process.exit(1);
  } finally {
    if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
    if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath);
  }
}

runTest();
