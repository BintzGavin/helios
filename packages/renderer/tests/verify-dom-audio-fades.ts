import { chromium, Route } from 'playwright';
import { DomStrategy } from '../src/strategies/DomStrategy.js';
import { RendererOptions } from '../src/types.js';

async function verify() {
  console.log('Verifying DomStrategy Audio Fades...');

  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Intercept requests to avoid actual network errors
  await page.route('**/*.mp3', (route: Route) => route.fulfill({ status: 200, body: 'dummy audio' }));

  // Set up page with media elements using specific attributes
  // Audio with fade-in=2s and fade-out=3s
  await page.setContent(`
    <html>
      <body>
        <h1>Audio Fades Test</h1>
        <audio src="https://example.com/fades.mp3" data-helios-fade-in="2" data-helios-fade-out="3" controls></audio>
      </body>
    </html>
  `);

  const strategy = new DomStrategy({ width: 1280, height: 720, fps: 30, durationInSeconds: 10, mode: 'dom' } as any);

  console.log('Running strategy.prepare()...');
  await strategy.prepare(page);

  const options: RendererOptions = {
    width: 1280,
    height: 720,
    fps: 30,
    durationInSeconds: 10, // 10s duration
    mode: 'dom'
  };

  console.log('Getting FFmpeg args...');
  const args = strategy.getFFmpegArgs(options, 'output.mp4');
  const argsString = args.join(' ');

  console.log('FFmpeg Args:', args);

  await browser.close();

  let success = true;

  // Expected Fade In: afade=t=in:st=0:d=2
  // Note: st=0 because there is no offset/delay here.
  if (!argsString.includes('afade=t=in:st=0:d=2')) {
    console.error('❌ Failed: Expected afade=t=in:st=0:d=2 for fades.mp3');
    success = false;
  } else {
    console.log('✅ Found afade=t=in:st=0:d=2');
  }

  // Expected Fade Out: afade=t=out:st=7:d=3
  // Duration is 10s, fade out is 3s. Start time = 10 - 3 = 7.
  if (!argsString.includes('afade=t=out:st=7:d=3')) {
    console.error('❌ Failed: Expected afade=t=out:st=7:d=3 for fades.mp3');
    success = false;
  } else {
    console.log('✅ Found afade=t=out:st=7:d=3');
  }

  if (success) {
    console.log('✅ Verification Passed');
    process.exit(0);
  } else {
    console.error('❌ Verification Failed');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
