import { chromium } from '@playwright/test';
import { spawn } from 'child_process';

async function main() {
  console.log('Starting Client-Side Export Verification...');

  // 1. Start the server
  console.log('Starting preview server...');
  // Use a unique port to avoid conflicts
  const PORT = 4174;
  const server = spawn('npx', ['vite', 'preview', '--outDir', 'output/example-build', '--port', String(PORT)], {
    stdio: 'ignore', // Ignore stdio to keep output clean, or 'inherit' for debugging
    shell: true
  });

  // Give the server a moment to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  let browser;
  try {
    // 2. Launch browser
    console.log('Launching browser...');
    // We need to ensure we have the browser installed. If not, this might fail.
    // The environment should have it, or we might need `npx playwright install` in the plan?
    // Memory says: "Executing Playwright-based E2E tests in a fresh environment requires manually installing browser binaries"
    // I'll assume they are installed or I might need to install them.
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // 3. Navigate to the example
    const url = `http://localhost:${PORT}/examples/client-export-api/index.html`;
    console.log(`Navigating to ${url}...`);

    const response = await page.goto(url);
    if (!response || response.status() !== 200) {
        throw new Error(`Failed to load page: ${response?.status()}`);
    }

    // 4. Click Export
    console.log('Clicking Export button...');
    const exportBtn = page.locator('#export-btn');
    await exportBtn.waitFor({ state: 'visible' });
    await exportBtn.click();

    // 5. Wait for completion
    console.log('Waiting for export to complete...');
    // The button text changes to "Exporting..." then "Export MP4" or "Done!"
    // In app.ts:
    // success: progressText.textContent = 'Done!';

    await page.waitForFunction(() => {
        const progress = document.getElementById('progress-text');
        return progress && progress.textContent === 'Done!';
    }, null, { timeout: 60000 });

    console.log('✅ Export completed successfully (UI indicated Done)!');

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    if (server) server.kill();
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    console.log('Stopping server...');
    if (server) {
        server.kill();
        // server.kill() might not kill the child process if shell: true is used on some systems,
        // but for this script it's likely fine as we exit process.
    }
    process.exit(0);
  }
}

main();
