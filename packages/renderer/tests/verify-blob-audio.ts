import { Renderer } from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function runTest() {
  console.log('Running Blob Audio Verification...');

  // 1. Create a temporary HTML file with Blob Audio
  const tempHtmlPath = path.join(os.tmpdir(), 'blob-audio-test.html');
  const outputVideoPath = path.join(os.tmpdir(), 'blob-audio-output.mp4');

  // Minimal valid WAV file (silence, 8kHz, 8bit, mono, 0.5s)
  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + 4000, 4); // 0.5s of 8k 8bit mono
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // subchunk1 size
  wavHeader.writeUInt16LE(1, 20); // PCM
  wavHeader.writeUInt16LE(1, 22); // mono
  wavHeader.writeUInt32LE(8000, 24); // sample rate
  wavHeader.writeUInt32LE(8000, 28); // byte rate
  wavHeader.writeUInt16LE(1, 32); // block align
  wavHeader.writeUInt16LE(8, 34); // bits per sample
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(4000, 40); // data size

  const pcmData = Buffer.alloc(4000, 128); // 128 is silence for 8-bit unsigned
  const wavFile = Buffer.concat([wavHeader, pcmData]);
  const wavBase64 = wavFile.toString('base64');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Blob Audio Test</title>
    </head>
    <body>
      <h1>Blob Audio Test</h1>
      <canvas id="canvas" width="640" height="360"></canvas>
      <script>
        // Draw something on canvas
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 640, 360);

        // Convert base64 to Blob
        const base64 = "${wavBase64}";
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/wav' });
        const blobUrl = URL.createObjectURL(blob);

        console.log('Created Blob URL:', blobUrl);

        // Create audio element
        const audio = document.createElement('audio');
        audio.src = blobUrl;
        audio.id = 'blob-audio';
        audio.controls = true;
        // Add data attributes to help dom-scanner identify it if needed,
        // though it should pick up all audio/video elements.
        audio.dataset.heliosOffset = "0";
        document.body.appendChild(audio);

        audio.preload = 'auto';

      </script>
    </body>
    </html>
  `;

  fs.writeFileSync(tempHtmlPath, htmlContent);
  console.log('Created temp HTML:', tempHtmlPath);

  // 2. Render
  const renderer = new Renderer({
    width: 640,
    height: 360,
    fps: 30,
    durationInSeconds: 1,
    mode: 'canvas',
  });

  try {
    if (fs.existsSync(outputVideoPath)) {
        fs.unlinkSync(outputVideoPath);
    }

    await renderer.render('file://' + tempHtmlPath, outputVideoPath);

    // 3. Verify Output
    if (!fs.existsSync(outputVideoPath)) {
      throw new Error('Output video not found');
    }

    const stats = fs.statSync(outputVideoPath);
    console.log(`Output video size: ${stats.size} bytes`);
    if (stats.size < 1000) {
       throw new Error('Output video seems too small (failed?)');
    }

    console.log('✅ Render successful.');

    // 4. Verify Cleanup
    const tmpFiles = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('helios_blob_') && f.endsWith('.wav'));
    if (tmpFiles.length > 0) {
        console.warn('⚠️ Found potential leftover blob files:', tmpFiles);
        // We consider this a warning, as other processes might be running, but ideally it should be empty.
    } else {
        console.log('✅ No leftover blob files found.');
    }

  } catch (e) {
    console.error('❌ Test failed:', e);
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
    if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath);
  }
}

runTest();
