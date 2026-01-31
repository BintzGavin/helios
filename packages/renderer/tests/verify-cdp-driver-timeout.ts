import { chromium } from 'playwright';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';

async function test() {
  console.log('Starting CdpTimeDriver Timeout test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Initialize with a short timeout (e.g. 500ms)
  const TIMEOUT_MS = 500;
  const driver = new CdpTimeDriver(TIMEOUT_MS);
  await driver.prepare(page);

  console.log(`Driver prepared with ${TIMEOUT_MS}ms timeout.`);

  // Inject mock helios object with a HANGING waitUntilStable
  // Use string evaluation to avoid esbuild artifacts (__name)
  await page.evaluate(`
    window.helios = {
      waitUntilStable: () => {
        console.log('Helper called, hanging indefinitely...');
        return new Promise(() => {}); // Never resolves
      }
    };
  `);

  console.log('Advancing time to 1.0s...');
  const startTime = Date.now();
  await driver.setTime(page, 1.0);
  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`setTime completed in ${duration}ms`);

  // Allow some margin for execution overhead.
  // In a slow environment, it might take longer, but it shouldn't hang indefinitely.
  if (duration >= TIMEOUT_MS) {
    console.log(`✅ Stability check timed out as expected (>= ${TIMEOUT_MS}ms).`);
  } else {
     console.error(`❌ returned too early (${duration}ms). It should have waited at least ${TIMEOUT_MS}ms.`);
     process.exit(1);
  }

  await browser.close();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
