import { chromium } from 'playwright';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver';

async function test() {
  console.log('Starting CdpTimeDriver test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const driver = new CdpTimeDriver();
  await driver.prepare(page);

  console.log('Driver prepared. Virtual time policy set to PAUSE.');

  // Capture initial time drift (time elapsed before prepare was called)
  const initialPageTime = await page.evaluate(() => document.timeline.currentTime) as number || 0;
  console.log(`Initial page time (drift): ${initialPageTime}ms`);

  // Set time to 1.0 second
  console.log('Advancing time to 1.0s...');
  const startTime = Date.now();
  await driver.setTime(page, 1.0);
  const elapsedRealTime = Date.now() - startTime;

  console.log(`Real time elapsed during setTime: ${elapsedRealTime}ms (should be significantly less than 1000ms if virtualized)`);

  // Verify within page using document.timeline.currentTime
  const pageTime = await page.evaluate(() => document.timeline.currentTime) as number;
  console.log(`Page document.timeline.currentTime: ${pageTime}ms`);

  // We expect roughly 1000ms + initial drift.
  const expectedTime = 1000 + initialPageTime;
  const diff = Math.abs(pageTime - expectedTime);

  if (diff < 50) {
    console.log(`✅ Time advanced correctly (diff: ${diff}ms).`);
  } else {
    console.error(`❌ Time did not advance correctly. Expected ~${expectedTime}ms, got ${pageTime}ms (diff: ${diff}ms)`);
    process.exit(1);
  }

  // Advance again to 2.0s
  console.log('Advancing time to 2.0s...');
  await driver.setTime(page, 2.0);
  const pageTime2 = await page.evaluate(() => document.timeline.currentTime) as number;
  console.log(`Page document.timeline.currentTime: ${pageTime2}ms`);

  const expectedTime2 = 2000 + initialPageTime;
  const diff2 = Math.abs(pageTime2 - expectedTime2);

   if (diff2 < 50) {
    console.log(`✅ Time advanced correctly to 2.0s (diff: ${diff2}ms).`);
  } else {
    console.error(`❌ Time did not advance correctly. Expected ~${expectedTime2}ms, got ${pageTime2}ms (diff: ${diff2}ms)`);
    process.exit(1);
  }

  await browser.close();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
