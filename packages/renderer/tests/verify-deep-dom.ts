import { chromium, Route } from 'playwright';
import { DomStrategy } from '../src/strategies/DomStrategy.js';
import { RendererOptions } from '../src/types.js';

async function verify() {
  console.log('Verifying Deep DOM Strategy (Iframe Discovery)...');

  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Intercept requests to avoid actual network errors
  await page.route('**/*.mp3', (route: Route) => route.fulfill({ status: 200, body: 'dummy audio' }));

  // Set up page with an iframe containing an audio element
  await page.setContent(`
    <html>
      <body>
        <h1>Main Frame</h1>
        <audio src="https://example.com/main-audio.mp3" controls></audio>
        <iframe srcdoc="
          <html>
            <body>
              <h1>Iframe</h1>
              <audio src='https://example.com/iframe-audio.mp3' controls></audio>
            </body>
          </html>
        "></iframe>
      </body>
    </html>
  `);

  // Wait for iframe to attach and load
  await page.waitForSelector('iframe');
  // Give it a moment for the inner DOM to be ready
  await page.waitForTimeout(500);

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

  console.log('FFmpeg Args:', args);

  const hasMainAudio = args.includes('https://example.com/main-audio.mp3');
  const hasIframeAudio = args.includes('https://example.com/iframe-audio.mp3');

  await browser.close();

  let success = true;

  if (!hasMainAudio) {
    console.error('❌ Failed: Expected main-audio.mp3 to be in args');
    success = false;
  } else {
    console.log('✅ Found main-audio.mp3');
  }

  if (!hasIframeAudio) {
    console.error('❌ Failed: Expected iframe-audio.mp3 to be in args');
    success = false;
  } else {
    console.log('✅ Found iframe-audio.mp3');
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
