import { chromium, Route } from 'playwright';
import { DomStrategy } from '../src/strategies/DomStrategy';
import { RendererOptions } from '../src/types';

async function verify() {
  console.log('Verifying Implicit Audio Discovery...');

  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Intercept requests
  await page.route('**/*.mp3', (route: Route) => route.fulfill({ status: 200, body: 'dummy audio' }));
  await page.route('**/*.mp4', (route: Route) => route.fulfill({ status: 200, body: 'dummy video' }));

  await page.setContent(`
    <html>
      <body>
        <audio src="https://example.com/audio.mp3" controls></audio>
        <video src="https://example.com/video.mp4" controls></video>
        <audio src="blob:http://example.com/1234" id="blob-audio"></audio>
      </body>
    </html>
  `);

  const strategy = new DomStrategy({ width: 1280, height: 720, fps: 30, durationInSeconds: 5, mode: 'dom' });

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

  const hasAudio = args.includes('https://example.com/audio.mp3');
  const hasVideoAudio = args.includes('https://example.com/video.mp4');
  const hasBlob = args.some(arg => arg.includes('blob:'));

  await browser.close();

  let success = true;

  if (!hasAudio) {
    console.error('❌ Failed: Expected https://example.com/audio.mp3 to be in args');
    success = false;
  } else {
    console.log('✅ Found audio.mp3');
  }

  if (!hasVideoAudio) {
    console.error('❌ Failed: Expected https://example.com/video.mp4 to be in args');
    success = false;
  } else {
    console.log('✅ Found video.mp4');
  }

  if (hasBlob) {
    console.error('❌ Failed: Blob URL should have been filtered out');
    success = false;
  } else {
    console.log('✅ Blob URL correctly ignored');
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
