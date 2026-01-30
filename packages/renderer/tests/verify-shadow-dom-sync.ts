import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyShadowDomSync() {
  console.log('Starting Shadow DOM Media Sync verification...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Serve a dummy video file
  // We look for a valid MP4 in the same directory to use as a dummy
  const videoPath = path.join(__dirname, 'test-output-range.mp4');
  let videoBuffer: Buffer;

  if (fs.existsSync(videoPath)) {
      videoBuffer = fs.readFileSync(videoPath);
  } else {
      console.warn("Warning: test-output-range.mp4 not found, using empty buffer (test might fail)");
      videoBuffer = Buffer.alloc(100);
  }

  await page.route('**/dummy.mp4', route => {
      route.fulfill({
          status: 200,
          contentType: 'video/mp4',
          body: videoBuffer
      });
  });

  const driver = new SeekTimeDriver();
  await driver.init(page);

  // Define a Custom Element with Shadow DOM containing a video
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <script>
        class VideoComponent extends HTMLElement {
          constructor() {
            super();
            this.attachShadow({ mode: 'open' });
          }
          connectedCallback() {
            this.shadowRoot.innerHTML = '<video id="shadow-video" src="dummy.mp4"></video>';
          }
        }
        customElements.define('video-component', VideoComponent);
      </script>

      <video-component id="comp"></video-component>
      <video id="regular-video" src="dummy.mp4"></video>
    </body>
    </html>
  `;

  await page.goto(`data:text/html,${encodeURIComponent(htmlContent)}`);

  await driver.prepare(page);

  // Use a small time value that is likely within the duration of the dummy video
  const seekTime = 0.5;
  console.log(`Setting time to ${seekTime}s...`);

  await driver.setTime(page, seekTime);

  // Verify
  const result = await page.evaluate(() => {
    const comp = document.getElementById('comp');
    const shadowVideo = comp?.shadowRoot?.getElementById('shadow-video') as HTMLVideoElement;
    const regularVideo = document.getElementById('regular-video') as HTMLVideoElement;

    return {
      shadowTime: shadowVideo?.currentTime,
      regularTime: regularVideo?.currentTime
    };
  });

  console.log(`Result at ${seekTime}s:`, result);

  const regularMatches = Math.abs((result.regularTime || 0) - seekTime) < 0.05;
  const shadowMatches = Math.abs((result.shadowTime || 0) - seekTime) < 0.05;

  await browser.close();

  if (!regularMatches) {
    console.error(`❌ FAILURE: Regular video should always sync. Expected ${seekTime}, got ${result.regularTime}`);
    process.exit(1);
  }

  if (shadowMatches) {
    console.log(`✅ SUCCESS: Shadow DOM video synced to ~${seekTime}s.`);
    process.exit(0);
  } else {
    console.error(`❌ FAILURE: Shadow DOM video NOT synced. Expected ${seekTime}, got ${result.shadowTime}`);
    process.exit(1);
  }
}

verifyShadowDomSync().catch(err => {
  console.error(err);
  process.exit(1);
});
