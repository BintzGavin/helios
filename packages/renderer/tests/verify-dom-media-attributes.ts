import { chromium, Route } from 'playwright';
import { DomStrategy } from '../src/strategies/DomStrategy.js';
import { RendererOptions } from '../src/types.js';

async function verify() {
  console.log('Verifying DomStrategy Media Attributes (Offset, Seek, Muted)...');

  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Intercept requests to avoid actual network errors
  await page.route('**/*.mp3', (route: Route) => route.fulfill({ status: 200, body: 'dummy audio' }));
  await page.route('**/*.mp4', (route: Route) => route.fulfill({ status: 200, body: 'dummy video' }));

  // Set up page with media elements using specific attributes
  // 1. Audio with offset=2.5s (2500ms)
  // 2. Video with seek=10s and muted (should be volume 0)
  // 3. Audio with defaults (no attributes)
  await page.setContent(`
    <html>
      <body>
        <h1>Media Attributes Test</h1>

        <!-- Case 1: Offset -->
        <audio src="https://example.com/offset.mp3" data-helios-offset="2.5" controls></audio>

        <!-- Case 2: Seek + Muted -->
        <video src="https://example.com/seek-muted.mp4" data-helios-seek="10" muted controls></video>

        <!-- Case 3: Defaults -->
        <audio src="https://example.com/default.mp3" controls></audio>
      </body>
    </html>
  `);

  const strategy = new DomStrategy({ width: 1280, height: 720, fps: 30, durationInSeconds: 5, mode: 'dom' } as any);

  console.log('Running strategy.prepare()...');
  await strategy.prepare(page);

  const options: RendererOptions = {
    width: 1280,
    height: 720,
    fps: 30,
    durationInSeconds: 5,
    mode: 'dom'
  };

  console.log('Getting FFmpeg args...');
  const args = strategy.getFFmpegArgs(options, 'output.mp4');
  const argsString = args.join(' ');

  console.log('FFmpeg Args:', args);

  await browser.close();

  let success = true;

  // Case 1: Offset 2.5s -> adelay=2500
  // Note: FFmpegBuilder implementation of offset uses 'adelay'.
  // We need to check if the filter graph contains the expected delay for the specific input.
  // Input 0 is video (image2pipe).
  // Input 1: offset.mp3
  // Input 2: seek-muted.mp4
  // Input 3: default.mp3

  // We'll look for simple patterns first, or check the args structure deeper if needed.
  // Ideally, 'adelay=2500' should appear in the filter complex.
  if (!argsString.includes('adelay=2500')) {
    console.error('❌ Failed: Expected adelay=2500 for offset.mp3');
    success = false;
  } else {
    console.log('✅ Found adelay=2500');
  }

  // Case 2: Seek 10s -> -ss 10 before input
  // FFmpeg input pattern: ... -ss 10 -i https://example.com/seek-muted.mp4 ...
  // So:
  // args[seekIndex] = URL
  // args[seekIndex-1] = -i
  // args[seekIndex-2] = 10
  // args[seekIndex-3] = -ss
  const seekIndex = args.indexOf('https://example.com/seek-muted.mp4');
  if (seekIndex > 2 && args[seekIndex - 3] === '-ss' && args[seekIndex - 2] === '10') {
    console.log('✅ Found -ss 10 before seek-muted.mp4');
  } else {
    console.error(`❌ Failed: Expected -ss 10 before seek-muted.mp4. Found: ${args[seekIndex-3]} ${args[seekIndex-2]}`);
    success = false;
  }

  // Case 2b: Muted -> volume=0
  // FFmpegBuilder uses 'volume=...' filter.
  // Since we have multiple inputs, they are mixed.
  // The muted track should have volume=0 applied.
  if (!argsString.includes('volume=0')) {
     console.error('❌ Failed: Expected volume=0 for muted video');
     success = false;
  } else {
     console.log('✅ Found volume=0');
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
