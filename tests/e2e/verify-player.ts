/**
 * E2E Verification Script for <helios-player>
 *
 * This script verifies the core interactive functionality of the Helios Player Web Component
 * in a real browser environment. It uses a mock composition fixture to ensure stability.
 */
import { chromium } from '@playwright/test';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const PORT = 4175;
const ROOT_DIR = process.cwd();

// Simple static file server
const server = http.createServer((req, res) => {
  // Prevent path traversal
  const safePath = path.normalize(req.url || '/').replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(ROOT_DIR, safePath);

  if (req.url === '/') {
      filePath = path.join(ROOT_DIR, 'index.html');
  }

  // Intercept the composition URL used in player.html and serve our mock instead
  if (req.url?.includes('composition.html') && !req.url.includes('mock-composition.html')) {
     console.log('Intercepting composition request, serving mock...');
     filePath = path.join(ROOT_DIR, 'tests/e2e/fixtures/mock-composition.html');
  }

  const ext = path.extname(filePath);
  const map: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.svg': 'image/svg+xml'
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
          console.warn(`404 Not Found: ${req.url} -> ${filePath}`);
          res.writeHead(404);
          res.end('Not found: ' + req.url);
      } else {
          console.error(`500 Server Error: ${err.code}`);
          res.writeHead(500);
          res.end('Server error: ' + err.code);
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': map[ext] || 'text/plain' });
    res.end(data);
  });
});

async function main() {
  console.log(`Starting static server on port ${PORT}...`);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  let browser;
  try {
    console.log('Launching browser...');
    browser = await chromium.launch();
    const page = await browser.newPage();

    console.log('Navigating to player fixture...');
    await page.goto(`http://localhost:${PORT}/tests/e2e/fixtures/player.html`);

    // Wait for the player to be defined and upgraded
    await page.waitForSelector('helios-player');
    const player = page.locator('helios-player');

    // ---------------------------------------------------------
    // 1. Playback Tests
    // ---------------------------------------------------------
    console.log('Running Playback Tests...');
    const playButton = player.locator('.play-pause-btn');
    const timeDisplay = player.locator('.time-display');
    await playButton.waitFor();
    await timeDisplay.waitFor();

    // Initial state: paused (so button label is "Play")
    let playLabel = await playButton.getAttribute('aria-label');
    if (playLabel !== 'Play') throw new Error(`Expected 'Play' label, got ${playLabel}`);

    const initialTime = await timeDisplay.textContent();
    console.log(`Initial time: ${initialTime}`);

    console.log('Clicking play...');
    await playButton.click();
    await page.waitForTimeout(1000);

    // Playing state: button label should be "Pause"
    playLabel = await playButton.getAttribute('aria-label');
    if (playLabel !== 'Pause') throw new Error(`Expected 'Pause' label, got ${playLabel}`);

    const afterTimeText = await timeDisplay.textContent();
    console.log(`Time after 1s: ${afterTimeText}`);

    if (afterTimeText === initialTime) {
        throw new Error('Time did not advance!');
    }

    console.log('Clicking pause...');
    await playButton.click();
    const pauseTimeText = await timeDisplay.textContent();
    await page.waitForTimeout(500);
    const pauseTimeText2 = await timeDisplay.textContent();

    // Paused state: button label should be "Play"
    playLabel = await playButton.getAttribute('aria-label');
    if (playLabel !== 'Play') throw new Error(`Expected 'Play' label, got ${playLabel}`);

    if (pauseTimeText !== pauseTimeText2) {
         throw new Error('Time advanced while paused!');
    }
    console.log('Playback Verified ✅');


    // ---------------------------------------------------------
    // 2. Scrubber Tests
    // ---------------------------------------------------------
    console.log('Running Scrubber Tests...');
    const scrubber = player.locator('input.scrubber');
    await scrubber.waitFor();

    // Set scrubber to 50% (approx)
    // We can't easily drag in playwright without precise coords, but we can set value
    // Since it's an input[type=range], we can use fill or eval
    await scrubber.evaluate((el: HTMLInputElement) => {
        el.value = '150'; // 5 seconds * 30 fps
        el.dispatchEvent(new Event('input'));
        el.dispatchEvent(new Event('change'));
    });

    await page.waitForTimeout(200);
    const scrubbedTimeText = await timeDisplay.textContent();
    console.log(`Scrubbed time: ${scrubbedTimeText}`);
    // Should be around 5.00
    if (!scrubbedTimeText?.includes('5.00')) {
        throw new Error(`Scrubber did not update time correctly. Got: ${scrubbedTimeText}`);
    }
    console.log('Scrubber Verified ✅');


    // ---------------------------------------------------------
    // 3. Menu Tests
    // ---------------------------------------------------------
    console.log('Running Menu Tests...');
    const settingsBtn = player.locator('.settings-btn');
    const settingsMenu = player.locator('.settings-menu');

    console.log('Opening settings menu...');
    await settingsBtn.click();
    await expectVisible(settingsMenu, 'Settings Menu');

    console.log('Closing settings menu (click outside)...');
    // Click on the player container (click layer)
    await player.click({ position: { x: 10, y: 10 } });
    await expectHidden(settingsMenu, 'Settings Menu');

    console.log('Menu Verified ✅');


    // ---------------------------------------------------------
    // 4. Volume Tests
    // ---------------------------------------------------------
    console.log('Running Volume Tests...');
    const volumeBtn = player.locator('.volume-btn');
    // Initial state: unmuted (so button label is "Mute")
    let volLabel = await volumeBtn.getAttribute('aria-label');
    if (volLabel !== 'Mute') throw new Error(`Expected 'Mute' label, got ${volLabel}`);

    console.log('Muting...');
    await volumeBtn.click();
    volLabel = await volumeBtn.getAttribute('aria-label');
    if (volLabel !== 'Unmute') throw new Error(`Expected 'Unmute' label, got ${volLabel}`);

    console.log('Unmuting...');
    await volumeBtn.click();
    volLabel = await volumeBtn.getAttribute('aria-label');
    if (volLabel !== 'Mute') throw new Error(`Expected 'Mute' label, got ${volLabel}`);

    console.log('Volume Verified ✅');


    console.log('🎉 All Player Verification Tests Passed!');

  } catch (err) {
    console.error('❌ Player Verification Failed:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

async function expectVisible(locator: any, name: string) {
    // Check if class list does not contain 'hidden'
    await locator.waitFor({ state: 'visible' });
    const classes = await locator.getAttribute('class');
    if (classes && classes.includes('hidden')) {
        throw new Error(`${name} should be visible but has hidden class`);
    }
}

async function expectHidden(locator: any, name: string) {
    // Check if class list contains 'hidden'
    // Playwright might consider it visible if display:block but opacity:0, etc.
    // Our 'hidden' class sets display:none.
    const classes = await locator.getAttribute('class');
    if (classes && !classes.includes('hidden')) {
        throw new Error(`${name} should be hidden but missing hidden class`);
    }
}

main();
