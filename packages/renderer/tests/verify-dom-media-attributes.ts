import { chromium, Route } from 'playwright';
import { DomStrategy } from '../src/strategies/DomStrategy.js';
import { RendererOptions } from '../src/types.js';

async function verify() {
  console.log('Verifying DomStrategy Media Attributes (Offset, Seek, Muted, PlaybackRate)...');

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
  // 4. Audio with playbackRate=2.0
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

        <!-- Case 4: Playback Rate -->
        <audio src="https://example.com/rate.mp3" playbackRate="2.0" controls></audio>
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
  const result = strategy.getFFmpegArgs(options, 'output.mp4');
  const args = result.args;
  const argsString = args.join(' ');

  console.log('FFmpeg Args:', args);

  await browser.close();

  let success = true;

  // Case 1: Offset 2.5s -> adelay=2500
  if (!argsString.includes('adelay=2500')) {
    console.error('❌ Failed: Expected adelay=2500 for offset.mp3');
    success = false;
  } else {
    console.log('✅ Found adelay=2500');
  }

  // Case 2: Seek 10s -> -ss 10 before input
  const seekIndex = args.indexOf('https://example.com/seek-muted.mp4');
  if (seekIndex > 2 && args[seekIndex - 3] === '-ss' && args[seekIndex - 2] === '10') {
    console.log('✅ Found -ss 10 before seek-muted.mp4');
  } else {
    console.error(`❌ Failed: Expected -ss 10 before seek-muted.mp4.`);
    success = false;
  }

  // Case 2b: Muted -> volume=0
  if (!argsString.includes('volume=0')) {
     console.error('❌ Failed: Expected volume=0 for muted video');
     success = false;
  } else {
     console.log('✅ Found volume=0');
  }

  // Case 4: Playback Rate 2.0 -> atempo=2.0
  if (!argsString.includes('atempo=2')) {
     console.error('❌ Failed: Expected atempo=2.0 for rate.mp3');
     success = false;
  } else {
     console.log('✅ Found atempo=2.0');
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
