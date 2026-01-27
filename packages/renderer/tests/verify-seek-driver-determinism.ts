import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver';

async function verifyDeterminism() {
  console.log('Starting SeekTimeDriver determinism verification...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const driver = new SeekTimeDriver();
  await driver.init(page);

  // Define a simple animation page that logs performance.now()
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <div id="box"></div>
      <script>
        window.logs = [];
        window.logTime = () => {
          window.logs.push({
            perf: performance.now(),
            date: Date.now()
          });
        };

        function loop(timestamp) {
           window.logs.push({
             rafTimestamp: timestamp,
             perf: performance.now(),
             date: Date.now()
           });
           requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
      </script>
    </body>
    </html>
  `;

  await page.goto(`data:text/html,${encodeURIComponent(htmlContent)}`);
  await driver.prepare(page);

  const fps = 30;
  const frameDuration = 1 / fps;
  const totalFrames = 10;
  const expectedLogs: any[] = [];

  console.log(`Simulating ${totalFrames} frames at ${fps} FPS...`);

  for (let i = 0; i < totalFrames; i++) {
    const time = i * frameDuration;
    await driver.setTime(page, time);

    // We add a small delay to induce potential drift if using wall clock
    await new Promise(r => setTimeout(r, 50));
  }

  // Retrieve logs from the page
  const logs = await page.evaluate(() => (window as any).logs);

  console.log(`Captured ${logs.length} frame logs.`);

  // Analyze logs
  let failures = 0;

  // We expect roughly one log per setTime call (since setTime waits for RAF).
  // Note: The first RAF might fire immediately on load, so we might have an initial log at ~0.
  // The driver calls 'requestAnimationFrame' inside setTime, but our loop also calls it.

  // Let's just check the last few logs to see if they match the expected time.
  // Specifically, we want to check if performance.now() matches the virtual time exactly.

  logs.forEach((log: any, index: number) => {
    // We can't easily map index to exact frame because of startup transients,
    // but we can check if the values look quantized to frame intervals.

    // However, the critical check is:
    // Is performance.now() == rafTimestamp? (Standard behavior)
    // Is performance.now() exactly equal to the set time?

    // With the polyfill, performance.now() should be EXACTLY time * 1000.
    // Without the polyfill, it will be wall clock time.

    console.log(`Frame ${index}: perf=${log.perf.toFixed(2)}, raf=${log.rafTimestamp.toFixed(2)}`);
  });

  // Strict check: Find a log entry that corresponds to frame 5 (approx 166.66ms)
  // If it's deterministc, we should find exact matches.

  // Actually, let's just check if we have distinct values that are perfectly spaced?
  // Or simpler: check if the difference between logs is exactly 33.333... ms?

  // Let's refine the success criteria:
  // If polyfill is working, performance.now() should equal the time we set.

  // To verify this rigorously, let's verify that for the LAST frame we set (frame 9 = 0.3s),
  // we have a log entry with exactly 300ms (or 299.999...).

  const lastTime = (totalFrames - 1) * frameDuration * 1000;
  const matchingLog = logs.find((l: any) => Math.abs(l.perf - lastTime) < 0.001);

  if (matchingLog) {
    console.log(`✅ SUCCESS: Found log entry matching target time ${lastTime.toFixed(2)}ms`);
  } else {
    console.log(`❌ FAILURE: No log entry found matching target time ${lastTime.toFixed(2)}ms`);
    console.log(`(This is expected before the fix)`);
    failures++;
  }

  await browser.close();

  if (failures > 0) {
    process.exit(1);
  }
}

verifyDeterminism().catch(err => {
  console.error(err);
  process.exit(1);
});
