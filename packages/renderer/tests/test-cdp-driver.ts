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

  // Set time to 1.0 second
  console.log('Advancing time to 1.0s...');
  const startTime = Date.now();
  await driver.setTime(page, 1.0);
  const elapsedRealTime = Date.now() - startTime;

  console.log(`Real time elapsed during setTime: ${elapsedRealTime}ms (should be significantly less than 1000ms if virtualized)`);

  // Verify within page using document.timeline.currentTime
  // Note: document.timeline.currentTime returns null if timeline is inactive, or a number in ms.
  const pageTime = await page.evaluate(() => document.timeline.currentTime);
  console.log(`Page document.timeline.currentTime: ${pageTime}ms`);

  // We expect roughly 1000ms.
  // Note: If the page is empty, there might be no timeline?
  // document.timeline is always present in modern browsers.

  if (typeof pageTime === 'number' && Math.abs(pageTime - 1000) < 50) {
    console.log('✅ Time advanced correctly.');
  } else {
    console.error(`❌ Time did not advance correctly. Expected ~1000ms, got ${pageTime}`);
    // If it's null, it might be because the page hasn't painted or started?
    // Let's try adding a simple animation to force timeline activity if needed.
    // But usually it works.
    process.exit(1);
  }

  // Advance again to 2.0s
  console.log('Advancing time to 2.0s...');
  await driver.setTime(page, 2.0);
  const pageTime2 = await page.evaluate(() => document.timeline.currentTime);
  console.log(`Page document.timeline.currentTime: ${pageTime2}ms`);

   if (typeof pageTime2 === 'number' && Math.abs(pageTime2 - 2000) < 50) {
    console.log('✅ Time advanced correctly to 2.0s.');
  } else {
    console.error(`❌ Time did not advance correctly. Expected ~2000ms, got ${pageTime2}`);
    process.exit(1);
  }

  await browser.close();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
