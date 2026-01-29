import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';

async function verifyWaapiSync() {
  console.log('Starting WAAPI Sync verification...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const driver = new SeekTimeDriver();
  await driver.init(page);

  // Define a page with a CSS animation
  // A red box moving 100px to the right over 1 second, linearly.
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @keyframes moveRight {
          from { transform: translateX(0px); }
          to { transform: translateX(100px); }
        }
        #box {
          width: 50px;
          height: 50px;
          background-color: red;
          position: absolute;
          left: 0;
          top: 0;
          animation: moveRight 1s linear forwards;
        }
      </style>
    </head>
    <body>
      <div id="box"></div>
    </body>
    </html>
  `;

  await page.goto(`data:text/html,${encodeURIComponent(htmlContent)}`);
  await driver.prepare(page);

  // We will check at 0.5s and 0.8s
  const checkPoints = [
    { time: 0.5, expectedX: 50 },
    { time: 0.8, expectedX: 80 }
  ];

  let failures = 0;

  for (const point of checkPoints) {
    console.log(`Setting time to ${point.time}s...`);
    await driver.setTime(page, point.time);

    // Get the transform value
    const transform = await page.evaluate(() => {
      const el = document.getElementById('box');
      if (!el) return null;
      const style = window.getComputedStyle(el);
      // getComputedStyle returns matrix(1, 0, 0, 1, x, y)
      return style.transform;
    });

    console.log(`At ${point.time}s, transform is: ${transform}`);

    // Parse matrix
    let x = 0;
    if (transform && transform.startsWith('matrix')) {
      const values = transform.match(/matrix\(([^)]+)\)/)?.[1].split(',').map(parseFloat);
      if (values && values.length >= 6) {
        x = values[4]; // The 5th value is tx (translateX)
      }
    } else if (transform === 'none') {
        x = 0;
    }

    console.log(`Parsed translateX: ${x}px (Expected: ${point.expectedX}px)`);

    // Allow small tolerance
    if (Math.abs(x - point.expectedX) > 1.0) {
      console.error(`❌ Mismatch at ${point.time}s: Expected ${point.expectedX}, got ${x}`);
      failures++;
    } else {
      console.log(`✅ Match at ${point.time}s`);
    }
  }

  await browser.close();

  if (failures > 0) {
    console.error(`❌ verification failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log(`✅ SUCCESS: WAAPI (CSS Animation) is correctly synchronized.`);
  }
}

verifyWaapiSync().catch(err => {
  console.error(err);
  process.exit(1);
});
