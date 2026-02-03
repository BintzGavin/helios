import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';
import { TimeDriver } from '../src/drivers/TimeDriver.js';

async function runTest() {
  console.log('Starting Visual Playback Rate Verification...');
  const browser = await chromium.launch();
  let failures = 0;

  async function testDriver(driverName: string, driver: TimeDriver, isCdp: boolean) {
    console.log(`\nTesting ${driverName}...`);
    const page = await browser.newPage();

    if (isCdp) {
        // CdpTimeDriver needs context permission/setup usually handled by prepare
    }

    await driver.init(page);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body>
        <!-- 1. Normal speed (default) -->
        <video id="v1"></video>

        <!-- 2. Fast speed (x2) via property -->
        <video id="v2"></video>

        <!-- 3. Slow speed (x0.5) via attribute -->
        <video id="v3" playbackRate="0.5"></video>

        <!-- 4. Combined with offset/seek -->
        <!-- Start at t=5 global. Input starts at 10s. Rate x2. -->
        <!-- At t=7 (2s later): Local=2*2=4. Target=10+4=14. -->
        <video id="v4" data-helios-offset="5" data-helios-seek="10" playbackRate="2"></video>

        <script>
          // Mock video behavior to avoid loading actual media
          const videos = document.querySelectorAll('video');
          videos.forEach(v => {
            Object.defineProperty(v, 'readyState', { value: 4, writable: true });
            // Mock play/pause to avoid errors
            v.play = () => Promise.resolve();
            v.pause = () => {};
            // Set playbackRate property for v2 explicitly
            if (v.id === 'v2') v.playbackRate = 2.0;
          });
        </script>
      </body>
      </html>
    `;

    await page.goto(`data:text/html,${encodeURIComponent(htmlContent)}`);
    await driver.prepare(page);

    // Test Case: t = 10.0 seconds
    const t = 10.0;
    await driver.setTime(page, t);

    // Verify times
    const times = await page.evaluate(() => {
      const v1 = document.getElementById('v1') as HTMLVideoElement;
      const v2 = document.getElementById('v2') as HTMLVideoElement;
      const v3 = document.getElementById('v3') as HTMLVideoElement;
      const v4 = document.getElementById('v4') as HTMLVideoElement;
      return {
        v1: v1.currentTime,
        v2: v2.currentTime,
        v3: v3.currentTime,
        v4: v4.currentTime
      };
    });

    console.log('Results:', times);

    // Assertions
    // v1: rate=1.0. t=10. Expected: 10
    if (Math.abs(times.v1 - 10) > 0.01) {
        console.error(`❌ ${driverName} v1 Failed: Expected 10, got ${times.v1}`);
        failures++;
    } else {
        console.log(`✅ ${driverName} v1 Passed`);
    }

    // v2: rate=2.0. t=10. Expected: 20
    if (Math.abs(times.v2 - 20) > 0.01) {
        console.error(`❌ ${driverName} v2 Failed: Expected 20, got ${times.v2}`);
        failures++;
    } else {
        console.log(`✅ ${driverName} v2 Passed`);
    }

    // v3: rate=0.5. t=10. Expected: 5
    if (Math.abs(times.v3 - 5) > 0.01) {
        console.error(`❌ ${driverName} v3 Failed: Expected 5, got ${times.v3}`);
        failures++;
    } else {
        console.log(`✅ ${driverName} v3 Passed`);
    }

    // v4: offset=5, seek=10, rate=2.0. t=10.
    // Local time = (10 - 5) = 5.
    // Scaled local = 5 * 2 = 10.
    // Target = 10 + 10 = 20.
    if (Math.abs(times.v4 - 20) > 0.01) {
        console.error(`❌ ${driverName} v4 Failed: Expected 20, got ${times.v4}`);
        failures++;
    } else {
        console.log(`✅ ${driverName} v4 Passed`);
    }

    await page.close();
  }

  await testDriver('SeekTimeDriver', new SeekTimeDriver(), false);
  await testDriver('CdpTimeDriver', new CdpTimeDriver(), true);

  await browser.close();

  if (failures > 0) {
    console.error(`\n❌ Verification Failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log('\n✅ All verification tests passed!');
  }
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
