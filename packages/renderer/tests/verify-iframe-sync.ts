import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';

async function verifyIframeSync() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const driver = new SeekTimeDriver();

  // Initialize driver (injects polyfills)
  await driver.init(page);

  // Set content with an iframe
  await page.goto(`data:text/html,
    <html>
      <body>
        <h1>Main Frame</h1>
        <iframe srcdoc="
          <html>
            <body>
              <h1>Iframe</h1>
              <script>
                console.log('Iframe loaded');
              </script>
            </body>
          </html>
        "></iframe>
      </body>
    </html>
  `);

  // Wait for iframe to attach
  await page.waitForSelector('iframe');
  const iframeElement = await page.$('iframe');
  const frame = await iframeElement?.contentFrame();

  if (!frame) {
    throw new Error('Iframe not found');
  }

  // Set time to 500ms
  const targetTime = 0.5;
  console.log(`Setting time to ${targetTime}s...`);
  await driver.setTime(page, targetTime);

  // Check main frame time
  const mainTime = await page.evaluate(() => performance.now());
  console.log(`Main frame time: ${mainTime}ms`);

  // Check iframe time
  const iframeTime = await frame.evaluate(() => performance.now());
  console.log(`Iframe time: ${iframeTime}ms`);

  const expectedTime = targetTime * 1000;

  if (Math.abs(mainTime - expectedTime) > 1) {
    console.error(`❌ Main frame time incorrect. Expected ${expectedTime}, got ${mainTime}`);
    process.exit(1);
  }

  if (Math.abs(iframeTime - expectedTime) > 1) {
    console.error(`❌ Iframe time incorrect. Expected ${expectedTime}, got ${iframeTime}`);
    // Do not exit immediately, let's see if we can catch the failure
    process.exit(1);
  }

  console.log('✅ Verification Passed: Both frames synced to virtual time.');
  await browser.close();
}

verifyIframeSync().catch(err => {
  console.error(err);
  process.exit(1);
});
