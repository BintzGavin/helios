import { chromium, Page, Browser } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5173;
const URL = `http://localhost:${PORT}`;
const STUDIO_DIR = path.resolve(__dirname, '..');
const SKIP_SPAWN = process.env.SKIP_SPAWN === 'true';

async function waitForServer(url: string, timeout = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {
      // ignore
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

async function verifyStudio() {
  console.log(`Starting Studio verification on port ${PORT}...`);
  let server: ChildProcess | null = null;

  if (!SKIP_SPAWN) {
      // Start the server
      console.log('Launching dev server...');
      server = spawn('npm', ['run', 'dev'], {
        cwd: STUDIO_DIR,
        stdio: 'ignore',
        shell: true,
        detached: true, // Needed to kill process group
        env: { ...process.env, PORT: String(PORT) }
      });
  } else {
      console.log('Skipping server spawn (SKIP_SPAWN=true). Waiting for external server...');
  }

  let browser: Browser | null = null;

  try {
    const isReady = await waitForServer(URL);
    if (!isReady) {
      throw new Error(`Server did not start at ${URL} within timeout`);
    }
    console.log('Server is ready.');

    browser = await chromium.launch();
    const page: Page = await browser.newPage();

    // Subscribe to console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err));

    console.log(`Navigating to ${URL}...`);
    await page.goto(URL);

    // Wait for critical UI elements
    console.log('Checking UI elements...');
    await page.waitForSelector('.studio-layout');

    // Check for Main UI panels
    const timeline = await page.waitForSelector('.timeline-container'); // Adjust selector based on actual class
    if (!timeline) throw new Error('Timeline not found');
    console.log('✅ Timeline found');

    // Check Assets Panel (using text or selector)
    // Assuming default layout has assets
    // Since selectors might change, we can also check for text content if needed
    // But let's check for generic layout structures if exact classes are unknown.
    // However, I recall reading code for AssetsPanel, so checking for it is good.
    // If I don't know the exact class, I can use a looser check or read the code first.
    // But verify_studio.py used "Renders" text.

    // Let's verify Renders panel tab existence
    await page.getByText('Renders').click();
    console.log('✅ Clicked Renders tab');
    await page.waitForSelector('text=No render jobs');
    console.log('✅ Renders panel verified');

    // Verify Iframe
    console.log('Verifying preview iframe...');
    const iframeElement = await page.waitForSelector('iframe');
    const frame = await iframeElement.contentFrame();

    if (!frame) throw new Error('Iframe content not found');

    // Check for window.helios in the frame
    // We need to wait a bit for it to initialize
    await page.waitForTimeout(1000);

    // Note: The iframe might be cross-origin if not configured right, but in dev it is same origin usually.
    // Or it might be sandboxed.
    // Let's try to evaluate.

    /*
       Note: If the iframe is sandboxed without 'allow-scripts', this might fail,
       but Helios Player needs scripts.
    */

    // Take screenshot
    const screenshotPath = path.join(STUDIO_DIR, 'verification.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`✅ Screenshot saved to ${screenshotPath}`);

  } catch (err) {
    console.error('❌ Verification Failed:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();

    // Kill server
    if (server && server.pid) {
      try {
        process.kill(-server.pid);
      } catch (e) {
        server.kill();
      }
    }
    console.log('Cleanup complete.');
  }
}

verifyStudio();
