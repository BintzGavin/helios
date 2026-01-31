/**
 * E2E Verification Script for <helios-player>
 *
 * This script verifies the core interactive functionality of the Helios Player Web Component
 * in a real browser environment. It serves a fixture (player.html) and uses Playwright
 * to click the Play/Pause button and verify the time advances.
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
          res.writeHead(404);
          res.end('Not found: ' + req.url);
      } else {
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
    // helios-player is the tag name
    await page.waitForSelector('helios-player');

    console.log('Waiting for controls...');
    // The player puts controls in Shadow DOM. Playwright penetrates shadow DOM by default.
    const playButton = page.locator('.play-pause-btn');
    await playButton.waitFor();
    console.log('Play button found.');

    const timeDisplay = page.locator('.time-display');
    await timeDisplay.waitFor();
    const initialTime = await timeDisplay.textContent();
    console.log(`Initial time: ${initialTime}`);

    console.log('Clicking play...');
    await playButton.click();

    console.log('Waiting 2 seconds...');
    await page.waitForTimeout(2000);

    const afterTimeText = await timeDisplay.textContent();
    console.log(`Time after 2s: ${afterTimeText}`);

    if (afterTimeText === initialTime) {
        throw new Error('Time did not advance!');
    }

    console.log('Clicking pause...');
    await playButton.click();

    const pauseTimeText = await timeDisplay.textContent();
    console.log(`Paused at: ${pauseTimeText}`);

    console.log('✅ Player Verification Passed!');

  } catch (err) {
    console.error('❌ Player Verification Failed:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main();
