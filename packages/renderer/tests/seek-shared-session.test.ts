import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';

// DomStrategy enables Runtime on the shared CDP session before the seek driver.
// Enabling it a second time does not replay executionContextCreated events.
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const driver = new SeekTimeDriver(1000);
  await driver.init(page);
  await page.goto('data:text/html,<body>seek-check</body>');
  await page.evaluate(() => {
    (window as any).helios = { fps: { value: 24 }, currentFrame: { value: 0 }, isVirtualTimeBound: true,
      seek(frame: number) { this.currentFrame.value = frame; },
    };
  });
  const cdp = await page.context().newCDPSession(page);
  (page as any)._sharedCdpSession = cdp;
  await cdp.send('Runtime.enable');
  await driver.prepare(page);
  for (const frame of [96, 0, 191, 36, 7, 14, 25, 31, 62, 107]) {
    await driver.setTime(page, frame * (1 / 24));
    const actual = await page.evaluate(() => (window as any).helios.currentFrame.value);
    assert.equal(actual, frame, 'Seeking must update the page even when Runtime was already enabled');
  }
  console.log('Shared-session stateless seek passed at frames 96, 0, 191, and 36.');
} finally { await browser.close(); }
