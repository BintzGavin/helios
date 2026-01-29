import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';

async function verifyStability() {
  console.log('Starting SeekTimeDriver stability verification...');

  const browser = await chromium.launch();
  let failures = 0;

  // --- Test 1: Default Timeout (should wait for 500ms) ---
  {
    console.log('\n--- Test 1: Default Timeout (30s) vs 500ms delay ---');
    const page = await browser.newPage();
    const driver = new SeekTimeDriver(); // Default timeout
    await driver.init(page);

    const htmlContent = `
      <!DOCTYPE html>
      <html><body><script>
        window.helios = {
          waitUntilStable: () => new Promise(resolve => setTimeout(resolve, 500))
        };
      </script></body></html>
    `;
    await page.goto(`data:text/html,${encodeURIComponent(htmlContent)}`);

    const start = Date.now();
    await driver.setTime(page, 1.0);
    const elapsed = Date.now() - start;

    if (elapsed < 450) {
      console.error(`❌ FAILURE: setTime returned too quickly (${elapsed}ms). Expected ~500ms.`);
      failures++;
    } else {
      console.log(`✅ setTime waited ${elapsed}ms (Expected ~500ms).`);
    }
    await page.close();
  }

  // --- Test 2: Short Timeout (should timeout early) ---
  {
    console.log('\n--- Test 2: Short Timeout (200ms) vs 1000ms delay ---');
    const page = await browser.newPage();
    const driver = new SeekTimeDriver(200); // 200ms timeout
    await driver.init(page);

    const htmlContent = `
      <!DOCTYPE html>
      <html><body><script>
        window.helios = {
          waitUntilStable: () => new Promise(resolve => setTimeout(resolve, 1000))
        };
      </script></body></html>
    `;
    await page.goto(`data:text/html,${encodeURIComponent(htmlContent)}`);

    const start = Date.now();
    await driver.setTime(page, 1.0);
    const elapsed = Date.now() - start;

    if (elapsed > 800) {
      console.error(`❌ FAILURE: setTime waited too long (${elapsed}ms). Expected ~200ms (timeout).`);
      failures++;
    } else {
      console.log(`✅ setTime timed out early at ${elapsed}ms (Expected ~200ms).`);
    }
    await page.close();
  }

  // --- Test 3: Long Timeout (should wait for long delay) ---
  {
    console.log('\n--- Test 3: Long Timeout (5000ms) vs 2000ms delay ---');
    const page = await browser.newPage();
    const driver = new SeekTimeDriver(5000); // 5s timeout
    await driver.init(page);

    const htmlContent = `
      <!DOCTYPE html>
      <html><body><script>
        window.helios = {
          waitUntilStable: () => new Promise(resolve => setTimeout(resolve, 2000))
        };
      </script></body></html>
    `;
    await page.goto(`data:text/html,${encodeURIComponent(htmlContent)}`);

    const start = Date.now();
    await driver.setTime(page, 1.0);
    const elapsed = Date.now() - start;

    if (elapsed < 1900) {
      console.error(`❌ FAILURE: setTime returned too quickly (${elapsed}ms). Expected ~2000ms.`);
      failures++;
    } else {
      console.log(`✅ setTime waited ${elapsed}ms (Expected ~2000ms).`);
    }
    await page.close();
  }

  await browser.close();

  if (failures > 0) {
    console.error(`\n❌ ${failures} tests failed.`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL SUCCESS: SeekTimeDriver respects stabilityTimeout.');
  }
}

verifyStability().catch(err => {
  console.error(err);
  process.exit(1);
});
