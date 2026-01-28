import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';

async function verifyDeterminism() {
  console.log('Starting SeekTimeDriver determinism verification...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const driver = new SeekTimeDriver();
  await driver.init(page);

  // Define a simple animation page that logs performance.now() and raf timestamp
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <div id="box"></div>
      <script>
        window.logs = [];

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
  const totalFrames = 10; // 0 to 9

  console.log(`Simulating ${totalFrames} frames at ${fps} FPS...`);

  const setTimes: number[] = [];
  for (let i = 0; i < totalFrames; i++) {
    const time = i * frameDuration;
    setTimes.push(time * 1000); // ms
    await driver.setTime(page, time);

    // Add delay to prove wall clock doesn't matter
    await new Promise(r => setTimeout(r, 20));
  }

  // Retrieve logs from the page
  const logs = await page.evaluate(() => (window as any).logs);

  console.log(`Captured ${logs.length} RAF logs.`);

  let failures = 0;

  // Check 1: RAF Timestamp must match performance.now()
  logs.forEach((log: any, i: number) => {
      if (Math.abs(log.rafTimestamp - log.perf) > 0.001) {
          console.error(`❌ Frame ${i}: RAF timestamp (${log.rafTimestamp}) != performance.now() (${log.perf})`);
          failures++;
      }
  });

  // Check 2: We must find a log entry for EACH set time
  setTimes.forEach((targetTime) => {
      const match = logs.find((l: any) => Math.abs(l.perf - targetTime) < 0.001);
      if (!match) {
           console.error(`❌ Missing frame: No log entry found for time ${targetTime.toFixed(3)}ms`);
           failures++;
      }
  });

  // Check 3: Date.now() should be anchored
  // It's harder to check exact value without knowing start time, but delta should match
  if (logs.length > 1) {
      const first = logs[0];
      const last = logs[logs.length - 1];
      const perfDelta = last.perf - first.perf;
      const dateDelta = last.date - first.date;

      if (Math.abs(perfDelta - dateDelta) > 1.0) {
          console.error(`❌ Date.now() drift: perfDelta=${perfDelta}, dateDelta=${dateDelta}`);
          failures++;
      }
  }

  await browser.close();

  if (failures > 0) {
    console.error(`❌ verification failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log(`✅ SUCCESS: SeekTimeDriver is deterministic.`);
  }
}

verifyDeterminism().catch(err => {
  console.error(err);
  process.exit(1);
});
