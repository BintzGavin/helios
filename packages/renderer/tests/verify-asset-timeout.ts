import { chromium, Route } from 'playwright';
import { DomStrategy } from '../src/strategies/DomStrategy.js';

async function verify() {
  console.log('Verifying Configurable Asset Timeout...');

  // Launch browser
  const browser = await chromium.launch({
    headless: true
  });
  const page = await browser.newPage();

  // Intercept requests to simulate a hang
  await page.route('**/hanging.jpg', (route: Route) => {
    // Do not fulfill, causing a hang
    console.log('[Test] Holding request for hanging.jpg');
  });

  // Set up page with a hanging image
  await page.setContent(`
    <html>
      <body>
        <img src="http://example.com/hanging.jpg" />
      </body>
    </html>
  `, { waitUntil: 'domcontentloaded' });

  // Configure strategy with short timeout
  const timeoutMs = 2000;
  const strategy = new DomStrategy({
    width: 1280,
    height: 720,
    fps: 30,
    durationInSeconds: 1,
    stabilityTimeout: timeoutMs,
    mode: 'dom'
  } as any);

  console.log(`Running strategy.prepare() with stabilityTimeout=${timeoutMs}ms...`);

  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(msg.text()));

  const start = Date.now();
  await strategy.prepare(page);
  const end = Date.now();
  const duration = end - start;

  console.log(`prepare() took ${duration}ms`);

  await browser.close();

  let success = true;

  // Verify duration
  // Should be close to 2000ms (timeout) + minimal overhead.
  if (duration < timeoutMs) {
    console.error(`❌ Failed: Duration ${duration}ms is less than timeout ${timeoutMs}ms (Logic didn't wait?)`);
    success = false;
  } else if (duration > timeoutMs + 2000) {
    console.error(`❌ Failed: Duration ${duration}ms is much longer than timeout ${timeoutMs}ms (Timeout ignored?)`);
    success = false;
  } else {
    console.log(`✅ Duration check passed (${duration}ms)`);
  }

  // Verify warning log
  console.log('All Logs:', consoleLogs);
  const timeoutLog = consoleLogs.find(l =>
    l.includes('[DomStrategy] Timeout waiting for') ||
    l.includes('[Helios Preload] Timeout waiting for') ||
    l.includes('[DomScanner] Timeout waiting for')
  );
  if (!timeoutLog) {
    console.error('❌ Failed: Expected timeout warning log not found.');
    success = false;
  } else {
    console.log(`✅ Timeout warning logged: "${timeoutLog}"`);
  }

  if (success) {
    console.log('✅ Verification Passed');
  } else {
    console.error('❌ Verification Failed');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
