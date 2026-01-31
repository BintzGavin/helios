import { chromium } from '@playwright/test';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { existsSync } from 'fs';

const PORT = 4176;
const ROOT_DIR = process.cwd();

// --- Discovery Logic (Mirroring verify-render.ts) ---

const CANVAS_OVERRIDES = new Set([
  'client-export-api',
  'audio-visualization',
  'procedural-generation',
  'react-three-fiber',
  'threejs-canvas-animation',
  'pixi-canvas-animation',
  'p5-canvas-animation',
  'animation-helpers',
  'simple-canvas-animation',
  'react-canvas-animation',
  'vue-canvas-animation',
  'svelte-canvas-animation',
  'solid-canvas-animation',
  'vanilla-typescript'
]);

function formatName(dirName: string) {
  return dirName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function discoverCases() {
  const examplesDir = path.resolve(process.cwd(), 'examples');
  const entries = await fs.promises.readdir(examplesDir, { withFileTypes: true });

  const cases = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dirName = entry.name;
      const compPath = path.join(examplesDir, dirName, 'composition.html');

      if (existsSync(compPath)) {
        let mode: 'dom' | 'canvas' = 'dom';
        if (dirName.includes('canvas') || CANVAS_OVERRIDES.has(dirName)) {
          mode = 'canvas';
        }

        cases.push({
          name: formatName(dirName),
          relativePath: `examples/${dirName}/composition.html`,
          mode: mode,
          dirName: dirName // Added to construct URL
        });
      }
    }
  }
  return cases.sort((a, b) => a.name.localeCompare(b.name));
}

// --- Server Logic (Mirroring verify-player.ts) ---

const server = http.createServer((req, res) => {
  const safePath = path.normalize(req.url || '/').replace(/^(\.\.[\/\\])+/, '');

  // Handle query parameters by splitting
  const urlPath = safePath.split('?')[0];

  let filePath = path.join(ROOT_DIR, urlPath);

  if (urlPath === '/' || urlPath === '') {
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
    res.writeHead(200, {
      'Content-Type': map[ext] || 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

// --- Main Verification Loop ---

async function main() {
  const filter = process.argv[2];
  console.log(`Starting Client-Side Export Verification on port ${PORT}...`);

  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  let browser;
  let failedCases = 0;

  try {
    const allCases = await discoverCases();
    let casesToRun = allCases;

    if (filter) {
      console.log(`Filtering cases by "${filter}"...`);
      casesToRun = allCases.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
    }

    console.log(`Discovered ${allCases.length} examples. Running ${casesToRun.length}.`);

    console.log('Launching browser...');
    browser = await chromium.launch({ headless: true });
    // Use a single context but new page for each test? Or new page?
    // New page is safer.

    for (const testCase of casesToRun) {
        console.log(`\nVerifying ${testCase.name} [${testCase.mode}]...`);
        const page = await browser.newPage();

        // Construct the URL to the generic fixture with the specific composition
        const compositionPath = `/output/example-build/${testCase.relativePath}`;
        // Ensure encoded URI components
        const fixtureUrl = `http://localhost:${PORT}/tests/e2e/fixtures/dynamic-player.html?src=${encodeURIComponent(compositionPath)}&export-mode=${testCase.mode}`;

        try {
            // Log console messages
            page.on('console', msg => {
                if (msg.type() === 'error') console.log(`    [Browser Error] ${msg.text()}`);
                else console.log(`    [Browser Log] ${msg.text()}`);
            });
            page.on('pageerror', err => {
                console.log(`    [Page Exception] ${err.message}`);
            });

            await page.goto(fixtureUrl);

            // Wait for player to load
            await page.waitForSelector('helios-player', { timeout: 10000 });

            // Wait for internal Shadow DOM controls
            // The export button class is .export-btn
            const exportBtn = page.locator('helios-player .export-btn');
            await exportBtn.waitFor({ state: 'visible', timeout: 5000 });

            console.log(`  Controls loaded. Clicking Export...`);

            // Setup download listener BEFORE clicking
            // Increased timeout to 120s because rendering must complete before download starts
            const downloadPromise = page.waitForEvent('download', { timeout: 120000 });

            await exportBtn.click();

            const download = await downloadPromise;
            const suggestedFilename = download.suggestedFilename();
            console.log(`  Download started: ${suggestedFilename}`);

            // Cancel the actual download to save time/bandwidth, we just need to know it started
            await download.cancel();

            console.log(`✅ ${testCase.name} Verified`);

        } catch (err) {
            console.error(`❌ ${testCase.name} Failed:`, err.message);
            // Optional: Screenshot on failure
            // await page.screenshot({ path: `failure-${testCase.dirName}.png` });
            failedCases++;
        } finally {
            await page.close();
        }
    }

  } catch (err) {
    console.error('Fatal Error:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log('\n--------------------------------------------------');
  if (failedCases > 0) {
      console.error(`❌ Verification finished with ${failedCases} failures.`);
      process.exit(1);
  } else {
      console.log(`✅ All examples verified successfully!`);
      process.exit(0);
  }
}

main();
