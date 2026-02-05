import { Renderer } from '../src/index';

async function main() {
  console.log('Verifying Renderer.diagnose()...');

  // Test Canvas Mode
  {
    console.log('\n--- Testing Canvas Mode ---');
    const renderer = new Renderer({
      mode: 'canvas',
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 1,
    });

    try {
      const report = await renderer.diagnose();
      console.log('Canvas Diagnostics:', report);
      if (report.browser?.videoEncoder === undefined) {
        throw new Error('Canvas diagnostics missing browser.videoEncoder');
      }
      if (!report.browser?.codecs) {
        throw new Error('Canvas diagnostics missing browser.codecs');
      }
      if (report.browser.codecs.h264 === undefined) {
        throw new Error('Canvas diagnostics missing h264 support flag');
      }
      // New checks for object structure
      const h264 = report.browser.codecs.h264;
      if (typeof h264 !== 'object') {
        throw new Error('Canvas diagnostics h264 should be an object');
      }
      if (h264.supported === undefined) {
         throw new Error('Canvas diagnostics missing h264.supported');
      }
      if (h264.hardware === undefined) {
         throw new Error('Canvas diagnostics missing h264.hardware');
      }
      if (h264.alpha === undefined) {
         throw new Error('Canvas diagnostics missing h264.alpha');
      }
    } catch (err) {
      console.error('Canvas diagnose failed:', err);
      process.exit(1);
    }
  }

  // Test DOM Mode
  {
    console.log('\n--- Testing DOM Mode ---');
    const renderer = new Renderer({
      mode: 'dom',
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 1,
    });

    try {
      const report = await renderer.diagnose();
      console.log('DOM Diagnostics:', report);
      if (report.browser?.waapi === undefined) {
        throw new Error('DOM diagnostics missing browser.waapi');
      }
      if (!report.browser?.viewport) {
         throw new Error('DOM diagnostics missing browser.viewport');
      }
      if (report.browser.webgl === undefined) {
         throw new Error('DOM diagnostics missing browser.webgl');
      }
    } catch (err) {
      console.error('DOM diagnose failed:', err);
      process.exit(1);
    }
  }

  console.log('\n✅ Verification passed!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
