import { Renderer } from '../src/index.js';
import * as assert from 'assert';

(async () => {
  console.log('Verifying FFmpeg Diagnostics...');

  const renderer = new Renderer({
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 1,
    mode: 'canvas', // Use canvas mode for speed/simplicity
  });

  try {
    const diagnostics = await renderer.diagnose();
    console.log('Diagnostics received:', JSON.stringify(diagnostics, null, 2));

    // Verify top-level keys
    assert.ok(diagnostics.browser, 'Browser diagnostics missing');
    assert.ok(diagnostics.ffmpeg, 'FFmpeg diagnostics missing');

    // Verify FFmpeg specific keys
    assert.ok(diagnostics.ffmpeg.present, 'FFmpeg should be present');
    assert.strictEqual(typeof diagnostics.ffmpeg.path, 'string', 'Path should be a string');
    assert.ok(diagnostics.ffmpeg.version, 'Version should be present');
    assert.ok(Array.isArray(diagnostics.ffmpeg.encoders), 'Encoders should be an array');
    assert.ok(Array.isArray(diagnostics.ffmpeg.filters), 'Filters should be an array');
    assert.ok(Array.isArray(diagnostics.ffmpeg.hwaccels), 'Hardware accelerators should be an array');

    // Check for common encoder (libx264)
    const hasH264 = diagnostics.ffmpeg.encoders.includes('libx264');
    if (!hasH264) {
        console.warn('⚠️ libx264 not found in encoders. This is unexpected for standard ffmpeg builds.');
    } else {
        console.log('✅ libx264 found.');
    }

    console.log('✅ FFmpeg Diagnostics Verified!');
  } catch (err) {
    console.error('❌ Verification Failed:', err);
    process.exit(1);
  }
})();
