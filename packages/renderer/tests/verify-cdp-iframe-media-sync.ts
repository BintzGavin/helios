import { chromium } from 'playwright';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';

async function run() {
  console.log('Verifying CdpTimeDriver Iframe Media Sync...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Create an iframe with a video element
  // We use a Data URI for the iframe source to make it self-contained
  const iframeContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <video id="innerVideo" loop></video>
      <script>
        // Mock duration to 10 seconds
        Object.defineProperty(HTMLMediaElement.prototype, 'duration', { get: () => 10 });

        // Mock media methods
        HTMLMediaElement.prototype.pause = () => {};
        HTMLMediaElement.prototype.play = async () => {};
      </script>
    </body>
    </html>
  `;
  const iframeSrc = `data:text/html;base64,${Buffer.from(iframeContent).toString('base64')}`;

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <h1>Main Page</h1>
      <iframe id="testFrame" src="${iframeSrc}"></iframe>
    </body>
    </html>
  `);

  // Wait for iframe to load
  const frameElement = await page.$('#testFrame');
  const frame = await frameElement?.contentFrame();

  if (!frame) {
    console.error('❌ Could not find iframe');
    process.exit(1);
  }

  await frame.waitForSelector('#innerVideo');

  // Initialize Driver
  const driver = new CdpTimeDriver();
  await driver.init(page);
  await driver.prepare(page);

  // Case 1: Time < Duration (5s)
  // Expected: 5s
  console.log('Setting time to 5.0s...');
  await driver.setTime(page, 5.0);

  let currentTime = await frame.evaluate(() => {
    return (document.getElementById('innerVideo') as HTMLVideoElement).currentTime;
  });

  if (Math.abs(currentTime - 5.0) > 0.1) {
    console.error(`❌ Case 1 Failed: Expected 5.0, got ${currentTime}`);
    process.exit(1);
  } else {
    console.log(`✅ Case 1 Passed: got ${currentTime}`);
  }

  // Case 2: Time > Duration (15s, duration 10s)
  // Expected: 5s (Looping)
  console.log('Setting time to 15.0s...');
  await driver.setTime(page, 15.0);

  currentTime = await frame.evaluate(() => {
    return (document.getElementById('innerVideo') as HTMLVideoElement).currentTime;
  });

  if (Math.abs(currentTime - 5.0) > 0.1) {
    console.error(`❌ Case 2 Failed: Expected 5.0, got ${currentTime}`);
    process.exit(1);
  } else {
    console.log(`✅ Case 2 Passed: got ${currentTime}`);
  }

  await browser.close();
  console.log('\nALL TESTS PASSED');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
