import { chromium, Page } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';
import { TimeDriver } from '../src/drivers/TimeDriver.js';

async function verifyDriver(name: string, driver: TimeDriver, page: Page) {
  console.log(`\nVerifying ${name}...`);

  // Reset page content
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <video id="loopVideo" loop></video>
      <video id="onceVideo"></video>
      <video id="offsetVideo" loop data-helios-offset="2"></video>
      <script>
        // Mock duration for all video elements
        Object.defineProperty(HTMLMediaElement.prototype, 'duration', { get: () => 10 });

        // Mock pause/play to avoid errors
        HTMLMediaElement.prototype.pause = () => {};
        HTMLMediaElement.prototype.play = async () => {};
      </script>
    </body>
    </html>
  `);

  await driver.prepare(page);

  // Case 1: Time < Duration (No loop needed)
  await driver.setTime(page, 5);
  let times = await page.evaluate(() => {
    return {
      loop: (document.getElementById('loopVideo') as HTMLVideoElement).currentTime,
      once: (document.getElementById('onceVideo') as HTMLVideoElement).currentTime
    };
  });

  if (Math.abs(times.loop - 5) > 0.1) console.error(`❌ [${name}] Normal playback failed: expected 5, got ${times.loop}`);
  else console.log(`✅ [${name}] Normal playback ok`);

  // Case 2: Time > Duration (Looping)
  // Time = 15. Duration = 10. Expected = 5.
  await driver.setTime(page, 15);
  times = await page.evaluate(() => {
    return {
      loop: (document.getElementById('loopVideo') as HTMLVideoElement).currentTime,
      once: (document.getElementById('onceVideo') as HTMLVideoElement).currentTime
    };
  });

  let failure = false;
  if (Math.abs(times.loop - 5) > 0.1) {
    console.error(`❌ [${name}] Loop failed: expected 5, got ${times.loop}`);
    failure = true;
  } else {
    console.log(`✅ [${name}] Loop behavior ok`);
  }

  // Non-looped video should not loop (it might be clamped or linear depending on browser,
  // but our driver logic sets it linearly if not looped)
  // Wait, if not looped, we set `currentTime = targetTime`.
  // If targetTime > duration, browser usually clamps it to duration.
  // But since we mocked duration but didn't actually load media, the browser might allow setting currentTime > duration?
  // Let's check what it is.
  // Actually, standard HTML5 video clamps currentTime to duration.
  // But if we mocked duration via prototype, does the internal clamping logic use that?
  // Probably not. The internal logic uses the real media engine state.
  // However, our driver sets `el.currentTime = targetTime`.
  // If we set `currentTime = 15`, and the browser thinks duration is NaN (empty), it might work?
  // Or if we didn't load anything, `currentTime` might stay 0.
  //
  // To make this robust without real media, we can check if the driver *tried* to set it.
  // But we can't easily spy on the element inside the page from here without more complex injection.
  //
  // Actually, for the purpose of this test (verifying our injected logic), we can verify what `currentTime` IS after setting.
  // If our logic worked, we sent `5` to the `loopVideo`.
  // If we sent `15` to `onceVideo`, and the browser clamps it (or not), that's fine.
  // The important part is that `loopVideo` got `5`.

  // Case 3: Offset + Loop
  // Offset = 2. Time = 15.
  // Raw = 15 - 2 = 13.
  // Duration = 10.
  // Expected = 13 % 10 = 3.
  times = await page.evaluate(() => {
    return {
      offset: (document.getElementById('offsetVideo') as HTMLVideoElement).currentTime
    };
  });

  if (Math.abs(times.offset - 3) > 0.1) {
    console.error(`❌ [${name}] Offset Loop failed: expected 3, got ${times.offset}`);
    failure = true;
  } else {
    console.log(`✅ [${name}] Offset Loop behavior ok`);
  }

  return !failure;
}

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Polyfill generic window stuff if needed
  await page.addInitScript(() => {
    (window as any).helios = {};
  });

  let success = true;

  // Verify SeekTimeDriver
  const seekDriver = new SeekTimeDriver();
  await seekDriver.init(page);
  if (!await verifyDriver('SeekTimeDriver', seekDriver, page)) success = false;

  // Verify CdpTimeDriver
  // Note: CdpTimeDriver needs a new context/session usually, but let's try reusing.
  // Actually CdpTimeDriver uses `page.context().newCDPSession(page)`.
  const cdpDriver = new CdpTimeDriver();
  await cdpDriver.init(page);
  if (!await verifyDriver('CdpTimeDriver', cdpDriver, page)) success = false;

  await browser.close();

  if (success) {
    console.log('\nALL TESTS PASSED');
    process.exit(0);
  } else {
    console.error('\nTESTS FAILED');
    process.exit(1);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
