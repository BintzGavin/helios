import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver';

async function verifyMediaSync() {
  console.log('Starting Media Sync verification...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const driver = new SeekTimeDriver();
  await driver.init(page);

  // We use a video element. Even without src, we can set currentTime.
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <video id="v1"></video>
      <audio id="a1"></audio>
    </body>
    </html>
  `;

  await page.goto(`data:text/html,${encodeURIComponent(htmlContent)}`);
  await driver.prepare(page);

  const targetTime = 12.34;
  console.log(`Setting time to ${targetTime}s...`);
  await driver.setTime(page, targetTime);

  // Verify
  const result = await page.evaluate(() => {
    const v = document.getElementById('v1') as HTMLVideoElement;
    const a = document.getElementById('a1') as HTMLAudioElement;
    return {
      vTime: v.currentTime,
      vPaused: v.paused,
      aTime: a.currentTime,
      aPaused: a.paused
    };
  });

  console.log('Result:', result);

  const vMatches = Math.abs(result.vTime - targetTime) < 0.001;
  const aMatches = Math.abs(result.aTime - targetTime) < 0.001;
  const paused = result.vPaused && result.aPaused;

  if (vMatches && aMatches && paused) {
    console.log(`✅ SUCCESS: Media elements synced to ~${targetTime}s and paused.`);
  } else {
    console.log(`❌ FAILURE: Media elements not synced.`);
    process.exit(1);
  }

  await browser.close();
}

verifyMediaSync().catch(err => {
  console.error(err);
  process.exit(1);
});
