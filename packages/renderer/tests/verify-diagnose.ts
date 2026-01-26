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
      if (report.videoEncoder === undefined) {
        throw new Error('Canvas diagnostics missing videoEncoder');
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
      if (report.waapi === undefined) {
        throw new Error('DOM diagnostics missing waapi');
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
