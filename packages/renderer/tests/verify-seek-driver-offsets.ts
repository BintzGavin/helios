import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Create a minimal HTML page with video elements
  // We use dummy sources, but SeekTimeDriver should set currentTime regardless of loading state
  // because we handle readystate check inside (or at least we should)
  // For this test, we might need actual media if we rely on 'seeked' events in the driver,
  // but if we are testing the calculation logic, setting currentTime works even if not playing.
  // However, SeekTimeDriver waits for 'seeked'. So we need valid src.
  // We can use a small base64 video to avoid network issues.

  // Small valid mp4 data uri
  const videoSrc = "data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAACQG1kYXQAAAAYZ2ItYwAAAAAAAAAAAB4AAAABMITAAAAbdWR0YQAAAA1tZXRhAAAAAAAAACFocGRsAAAAH21kbXIAZmxhc2gAABnZmxhc2hwbGF5ZXIgMTAuMi4wAAAAXW1vb3YAAABsbXZoZAAAAABZJ1fXWSdX1wAA+gAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABwdHJhawAAAFx0a2hkAAAAAdknV9fZJ1fXAAAAAQAAAAEAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmW1kaWEAAAAgbWRoZAAAAABZJ1fXWSdX1wAA+gAAAAEAAAA1VxAAAAAhaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvAAAAAI9taW5mAAAAFHZtaGQAAAAAAAACAAAAAAAhZGlbmQAAAAx1cmwgAAAAAQAAAAEAAABxYmJsdQAAAFxzdHNkAAAAAAAAAAEAAABMbXA0dgAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAAAZ//8AAAAxYXZjQwH0AAr/4QAZZ/QACq609NQYBAAAAAACABhzcDl4AAAAZHV1aWRraHpH1cxLq7Nzk3OyK/N3tQAAAAx1c210AAAAAFRtdGDTLM%2F2AAEAADEAAAAAAAAAAAAAAAAsAAAAAQAAABlzdHNzAAAAAAAAAAEAAAABAAAAFHN0dHMAAAAAAAAAAQAAAAEAAAD6c3RzYwAAAAAAAAABAAAAAQAAAAEAAAAUc3R6MAAAAAAAAAABAAAAGHN0Y28AAAAAAAAAAQAAADAAAAAAY3R0cwAAAAAAAAABAAAAAQAAABAAAAA=";

  await page.setContent(`
    <html>
      <body>
        <video id="v1" data-helios-offset="2" src="${videoSrc}"></video>
        <video id="v2" data-helios-seek="5" src="${videoSrc}"></video>
        <video id="v3" data-helios-offset="2" data-helios-seek="5" src="${videoSrc}"></video>
        <video id="v4" src="${videoSrc}"></video>
      </body>
    </html>
  `);

  const driver = new SeekTimeDriver();
  await driver.init(page);

  // Helper to get current times
  const getTimes = async () => {
    return page.evaluate(() => {
      return {
        v1: (document.getElementById('v1') as HTMLVideoElement).currentTime,
        v2: (document.getElementById('v2') as HTMLVideoElement).currentTime,
        v3: (document.getElementById('v3') as HTMLVideoElement).currentTime,
        v4: (document.getElementById('v4') as HTMLVideoElement).currentTime,
      };
    });
  };

  console.log('Testing t=1.0...');
  // Note: The driver waits for 'seeked' event. Since we are using base64 video, it should happen.
  try {
    await driver.setTime(page, 1.0);
  } catch (e) {
    console.warn("Driver setTime timed out or failed (expected if video doesn't load fast enough, but valid for logic check):", e);
  }

  let times = await getTimes();

  // v1: offset=2. t=1 -> 1-2 = -1 -> 0
  // v2: seek=5. t=1 -> 1+5 = 6
  // v3: offset=2, seek=5. t=1 -> 1-2+5 = 4
  // v4: t=1 -> 1

  const isClose = (a: number, b: number) => Math.abs(a - b) < 0.1;

  console.log('Results at t=1.0:', times);

  if (!isClose(times.v1, 0)) throw new Error(`v1 at t=1.0 failed: expected 0, got ${times.v1}`);
  if (!isClose(times.v2, 6)) throw new Error(`v2 at t=1.0 failed: expected 6, got ${times.v2}`);
  if (!isClose(times.v3, 4)) throw new Error(`v3 at t=1.0 failed: expected 4, got ${times.v3}`);
  if (!isClose(times.v4, 1)) throw new Error(`v4 at t=1.0 failed: expected 1, got ${times.v4}`);

  console.log('Testing t=3.0...');
  try {
    await driver.setTime(page, 3.0);
  } catch (e) {
      console.warn("Driver setTime warning:", e);
  }
  times = await getTimes();

  // v1: offset=2. t=3 -> 3-2 = 1
  // v2: seek=5. t=3 -> 3+5 = 8
  // v3: offset=2, seek=5. t=3 -> 3-2+5 = 6
  // v4: t=3 -> 3

  console.log('Results at t=3.0:', times);

  if (!isClose(times.v1, 1)) throw new Error(`v1 at t=3.0 failed: expected 1, got ${times.v1}`);
  if (!isClose(times.v2, 8)) throw new Error(`v2 at t=3.0 failed: expected 8, got ${times.v2}`);
  if (!isClose(times.v3, 6)) throw new Error(`v3 at t=3.0 failed: expected 6, got ${times.v3}`);
  if (!isClose(times.v4, 3)) throw new Error(`v4 at t=3.0 failed: expected 3, got ${times.v4}`);

  console.log('✅ SUCCESS: SeekTimeDriver respects offsets and seeks.');
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
