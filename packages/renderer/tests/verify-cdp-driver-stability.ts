import { chromium } from 'playwright';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';

async function test() {
  console.log('Starting CdpTimeDriver Stability test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const driver = new CdpTimeDriver();
  await driver.prepare(page);

  console.log('Driver prepared.');

  // Inject mock helios object with waitUntilStable
  // Use string evaluation to avoid esbuild artifacts (__name)
  await page.evaluate(`
    window.helios = {
      waitUntilStable: async () => {
        window.__STABILITY_CHECK_CALLED__ = true;
        return Promise.resolve();
      }
    };
  `);

  console.log('Advancing time to 1.0s...');
  await driver.setTime(page, 1.0);

  // Check if the stability check was called
  const wasCalled = await page.evaluate(`window.__STABILITY_CHECK_CALLED__`);

  if (wasCalled) {
    console.log('✅ Stability check was awaited.');
  } else {
    console.error('❌ Stability check was NOT awaited.');
    process.exit(1);
  }

  await browser.close();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
