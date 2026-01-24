import { test, expect } from '@playwright/test';
import path from 'path';

test('verify bridge export', async ({ page }) => {
  // Go to the test page
  // Assuming the test runner serves the root
  await page.goto('/tests/manual/bridge-export.html');

  // Wait for the player to be ready
  // The status overlay should disappear
  const overlay = page.locator('helios-player >> .status-overlay');
  await expect(overlay).toHaveClass(/hidden/, { timeout: 10000 });

  // Click Export
  const exportBtn = page.locator('helios-player >> .export-btn');
  await exportBtn.click();

  // Wait for download
  const downloadPromise = page.waitForEvent('download');
  const download = await downloadPromise;

  console.log(`Download started: ${download.suggestedFilename()}`);
  expect(download.suggestedFilename()).toBe('video.mp4');
});
