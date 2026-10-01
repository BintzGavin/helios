import { chromium } from 'playwright';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';

// CdpTimeDriver must seek media to the target time *before* it advances the
// virtual clock, so nothing that runs at a new virtual time sees the old media
// time.
//
// Every sample is tagged with the virtual clock it ran at (the driver makes
// performance.now() virtual). Headless Chromium keeps firing
// requestAnimationFrame on its real-time frame clock while virtual time is
// paused, so frames at the *previous* time can land in a step's log before
// setTime() has issued its media sync. Those frames are in sync with the clock
// they ran at, so only samples taken after the clock moved past the previous
// time are judged. A virtual-time interval guarantees such samples exist every
// step, whatever the rAF cadence.

type Sample = { source: 'raf' | 'timer'; virtualTimeMs: number; videoTime: number };

async function verifyCdpMediaSyncTiming() {
  console.log('Starting CdpTimeDriver media sync timing verification...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const driver = new CdpTimeDriver();
  await driver.init(page);

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <video id="v1" controls></video>
      <script>
        window.logs = [];
        const v1 = document.getElementById('v1');
        v1.currentTime = 0;

        window.sample = (source) => {
          window.logs.push({
            source,
            virtualTimeMs: performance.now(),
            videoTime: v1.currentTime
          });
        };

        function loop() {
           window.sample('raf');
           requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
      </script>
    </body>
    </html>
  `);

  await driver.prepare(page);

  // Started after prepare() so the interval is scheduled on the virtual clock.
  await page.evaluate(() => setInterval(() => (window as any).sample('timer'), 50));

  // Warmup
  await driver.setTime(page, 0.1);

  let previousTime = 0.1;
  for (const target of [1.0, 2.0]) {
    console.log(`Setting time to ${target}s...`);
    await page.evaluate(() => (window as any).logs = []);
    await driver.setTime(page, target);

    const logs: Sample[] = await page.evaluate(() => (window as any).logs);
    const previousMs = Math.round(previousTime * 1000);
    const advanced = logs.filter(l => l.virtualTimeMs > previousMs);
    const stale = advanced.filter(l => Math.abs(l.videoTime - target) > 0.001);

    console.log(
      `  ${logs.length - advanced.length} sample(s) at the previous time (ignored), ` +
      `${advanced.length} after the clock advanced ` +
      `(${advanced.filter(l => l.source === 'raf').length} rAF)`
    );

    if (stale.length > 0) {
      console.error(`❌ FAILURE: media was not at ${target}s once the clock advanced past ${previousTime}s:`, stale);
      process.exit(1);
    }
    if (advanced.length === 0) {
      console.error(`❌ FAILURE: nothing ran after the clock advanced to ${target}s, so media sync was not checked.`);
      process.exit(1);
    }
    console.log(`✅ ${target}s OK: every sample after the clock advanced saw videoTime ${target}.`);
    previousTime = target;
  }

  await browser.close();
  console.log('✅ VERIFICATION PASSED');
}

verifyCdpMediaSyncTiming().catch(err => {
  console.error(err);
  process.exit(1);
});
