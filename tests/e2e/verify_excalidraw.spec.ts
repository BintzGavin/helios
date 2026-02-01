import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';

let server;
const port = 8085;

test.beforeAll(async () => {
  console.log('Starting HTTP server...');
  server = spawn('python3', ['-m', 'http.server', port.toString()], {
    cwd: path.resolve(process.cwd(), 'output/example-build'),
    stdio: 'ignore',
  });
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
});

test.afterAll(() => {
  if (server) server.kill();
});

test('excalidraw example renders correctly', async ({ page }) => {
  const url = `http://localhost:${port}/examples/excalidraw-animation/composition.html`;
  console.log(`Navigating to ${url}`);
  await page.goto(url);

  // Wait for helios to be defined
  await page.waitForFunction(() => !!window.helios, null, { timeout: 10000 });
  console.log('Helios initialized');

  // Check for Excalidraw container
  await expect(page.locator('.excalidraw')).toBeVisible({ timeout: 20000 });
  console.log('Excalidraw container visible');

  // Check for Excalidraw canvas
  await expect(page.locator('canvas.excalidraw__canvas').first()).toBeVisible();
  console.log('Excalidraw canvas visible');

  // Seek to a frame where elements should be visible (Frame 150 = 5s)
  await page.evaluate(() => {
    window.helios.seek(150);
  });
  console.log('Seeked to frame 150');

  // Check frame counter overlay
  await expect(page.locator('text=Frame: 150')).toBeVisible();
  console.log('Frame counter verified');
});
