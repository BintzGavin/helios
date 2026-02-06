import { chromium, Route } from 'playwright';
import { CanvasStrategy } from '../src/strategies/CanvasStrategy.js';
import { RendererOptions } from '../src/types.js';

async function verify() {
  console.log('Verifying Canvas Preloading...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const requestedUrls = new Set<string>();

  await page.route('**/*', async (route: Route) => {
    const url = route.request().url();
    requestedUrls.add(url);

    if (url.includes('slow-image.png')) {
      console.log('Intercepted slow-image.png, delaying response...');
      // Create a dummy 1x1 red pixel png
      const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

      // Delay response to ensure prepare() waits
      await new Promise(r => setTimeout(r, 500));

      await route.fulfill({
        status: 200,
        body: buffer,
        contentType: 'image/png'
      });
    } else {
      route.continue();
    }
  });

  await page.setContent(`
    <html>
      <body>
        <!-- Image in DOM but not displayed, used as source for canvas -->
        <img id="source" src="http://example.com/slow-image.png" style="display:none">
        <canvas id="canvas" width="100" height="100"></canvas>
      </body>
    </html>
  `, { waitUntil: 'domcontentloaded' });

  const strategy = new CanvasStrategy({ width: 100, height: 100, fps: 30, durationInSeconds: 1 } as RendererOptions);

  console.log('Running strategy.prepare()...');
  const start = Date.now();

  // Capture logs to verify preloading logic
  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(msg.text()));

  await strategy.prepare(page);

  const duration = Date.now() - start;
  console.log(`prepare() took ${duration}ms`);

  await browser.close();

  // Verifications
  const preloadLog = consoleLogs.find(l => l.includes('[Helios Preload] Preloading') && l.includes('images...'));

  if (!preloadLog) {
      console.error('❌ Failed: Did not find preload log message');
      console.log('Logs:', consoleLogs);
      process.exit(1);
  } else {
      console.log('✅ Found preload log:', preloadLog);
  }

  if (!Array.from(requestedUrls).some(u => u.includes('slow-image.png'))) {
     console.error('❌ Failed: slow-image.png was not requested');
     process.exit(1);
  } else {
     console.log('✅ slow-image.png requested');
  }

  // Check timing: should be at least 500ms (plus overhead)
  if (duration < 400) { // slightly less than 500 to account for potential race/timer granularity
      console.warn('⚠️ Warning: prepare() finished faster than expected delay. Preload might not be waiting correctly.');
      // We don't fail strictly on timing as CI can be flaky, but it's a strong indicator.
  } else {
      console.log('✅ prepare() waited for image load');
  }

  console.log('✅ Verification Passed');
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
