import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';

async function verifyStability() {
  console.log('Starting SeekTimeDriver stability verification...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const driver = new SeekTimeDriver();
  await driver.init(page);

  // Define a page that mocks window.helios
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <script>
        // Mock Helios
        window.helios = {
          waitUntilStable: () => {
             // Set a flag that we were called
             window.__helios_stable_called = true;
             // Simulate work
             return new Promise(resolve => setTimeout(resolve, 500));
          }
        };
        window.__helios_stable_called = false;
      </script>
    </body>
    </html>
  `;

  await page.goto(`data:text/html,${encodeURIComponent(htmlContent)}`);

  const startTime = Date.now();
  console.log('Setting time to 1.0s...');
  await driver.setTime(page, 1.0);
  const endTime = Date.now();
  const elapsed = endTime - startTime;

  console.log(`setTime took ${elapsed}ms`);

  // Assertions
  const wasCalled = await page.evaluate(() => (window as any).__helios_stable_called);

  let failures = 0;

  if (!wasCalled) {
    console.error('❌ FAILURE: window.helios.waitUntilStable() was NOT called.');
    failures++;
  } else {
    console.log('✅ window.helios.waitUntilStable() was called.');
  }

  if (elapsed < 450) { // Allow some jitter, but should be close to 500ms
    console.error(`❌ FAILURE: setTime returned too quickly (${elapsed}ms). Expected > 500ms.`);
    failures++;
  } else {
    console.log('✅ setTime waited for stability check.');
  }

  await browser.close();

  if (failures > 0) {
    process.exit(1);
  } else {
    console.log('✅ SUCCESS: SeekTimeDriver respects helios.waitUntilStable()');
  }
}

verifyStability().catch(err => {
  console.error(err);
  process.exit(1);
});
