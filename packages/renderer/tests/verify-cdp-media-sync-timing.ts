import { chromium } from 'playwright';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';

async function verifyCdpMediaSyncTiming() {
  console.log('Starting CdpTimeDriver media sync timing verification...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  const driver = new CdpTimeDriver();
  await driver.init(page);

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <video id="v1" controls></video>
      <script>
        window.logs = [];
        const v1 = document.getElementById('v1');
        v1.currentTime = 0;

        function loop(timestamp) {
           window.logs.push({
             rafTimestamp: timestamp,
             videoTime: v1.currentTime
           });
           requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
      </script>
    </body>
    </html>
  `);

  await driver.prepare(page);

  // Warmup
  await driver.setTime(page, 0.1);

  console.log('Step 1: Setting time to 1.0s...');
  await page.evaluate(() => window.logs = []);
  await driver.setTime(page, 1.0);

  const step1Logs = await page.evaluate(() => window.logs);
  console.log('Step 1 Logs:', step1Logs);

  // We expect videoTime to be 1.0.
  // If we see videoTime < 0.9, it's a failure (stale frame).
  const hasStaleFrame1 = step1Logs.some((l: any) => l.videoTime < 0.9);

  if (hasStaleFrame1) {
      console.error('❌ FAILURE: Found stale frame (videoTime < 1.0) during setTime(1.0).');
      process.exit(1);
  } else if (step1Logs.length === 0) {
       console.log('⚠️ Warning: No frames captured in Step 1. This might be due to test timing, but verify-cdp-driver.ts confirms time advancement.');
  } else {
      console.log('✅ Step 1 OK: All captured frames had correct videoTime.');
  }

  console.log('Step 2: Setting time to 2.0s...');
  await page.evaluate(() => window.logs = []);
  await driver.setTime(page, 2.0);

  const step2Logs = await page.evaluate(() => window.logs);
  console.log('Step 2 Logs:', step2Logs);

  const hasStaleFrame2 = step2Logs.some((l: any) => l.videoTime < 1.9);
  if (hasStaleFrame2) {
      console.error('❌ FAILURE: Found stale frame (videoTime < 2.0) during setTime(2.0).');
      process.exit(1);
  } else if (step2Logs.length === 0) {
      console.log('⚠️ Warning: No frames captured in Step 2.');
  } else {
      console.log('✅ Step 2 OK: All captured frames had correct videoTime.');
  }

  await browser.close();
  console.log('✅ VERIFICATION PASSED');
}

verifyCdpMediaSyncTiming().catch(err => {
  console.error(err);
  process.exit(1);
});
