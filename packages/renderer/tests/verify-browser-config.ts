import { Renderer } from '../src/index.js';

async function main() {
  console.log('Verifying browser config...');

  const renderer = new Renderer({
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 1,
    browserConfig: {
      args: ['--user-agent=HeliosTestAgent'],
    },
  });

  try {
    const diagnostics = await renderer.diagnose();
    console.log('Diagnostics:', JSON.stringify(diagnostics, null, 2));

    const userAgent = diagnostics.browser.userAgent;
    if (userAgent && userAgent.includes('HeliosTestAgent')) {
      console.log('✅ Success: User agent contains "HeliosTestAgent".');
    } else {
      console.error('❌ Failure: User agent does NOT contain "HeliosTestAgent".');
      console.error('Actual user agent:', userAgent);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error during diagnostics:', err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
