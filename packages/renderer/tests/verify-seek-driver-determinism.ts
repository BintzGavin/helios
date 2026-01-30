import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';

const FIXED_EPOCH = 1704067200000;

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

  // Check 3: Date.now() should be anchored to FIXED_EPOCH
  if (logs.length > 0) {
      const first = logs[0];
      // The first frame is at time=0 (or close to it), so Date.now() should be close to FIXED_EPOCH
      // We check if it matches exactly for time=0, but since raf might fire slightly later, we check delta.
      // Actually, our driver sets time explicitly.

      // Since we set time 0, perf should be 0, and date should be FIXED_EPOCH.
      if (Math.abs(first.date - FIXED_EPOCH) > 100) {
           console.error(`❌ Date.now() anchor mismatch: Expected ~${FIXED_EPOCH}, got ${first.date}`);
           failures++;
      }

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
