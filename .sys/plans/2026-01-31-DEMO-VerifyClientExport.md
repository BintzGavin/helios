# 2026-01-31-DEMO-VerifyClientExport.md

#### 1. Context & Goal
- **Objective**: Create an automated E2E test for client-side video export (WebCodecs) in `<helios-player>`.
- **Trigger**: Identified a critical gap where the "Primary Export Path" (WebCodecs) has zero automated coverage, unlike the server-side render path. This was highlighted in the `.jules/DEMO.md` journal.
- **Impact**: Ensures the in-browser export functionality works correctly, validating the core vision of "Client-Side WebCodecs as Primary Export" and preventing regressions in future releases.

#### 2. File Inventory
- **Create**:
  - `tests/e2e/verify-client-export.ts`: A new test script that automates the verification of client-side export.
- **Modify**: None.
- **Read-Only**:
  - `vite.config.js`: To reuse existing alias configurations for `@helios-project/core`.
  - `examples/simple-animation/composition.html`: The target composition to be exported.
  - `packages/player/src/index.ts`: The player source code to be tested.

#### 3. Implementation Spec
- **Architecture**:
  - **Runner**: A standalone Node.js script executing via `tsx`.
  - **Server**: Programmatic instance of `ViteDevServer` (via `vite.createServer`) serving the repository root. This enables direct usage of TypeScript sources (`packages/player/src/index.ts`) without a separate build step for the player package, ensuring we test the current code state.
  - **Browser Automation**: Playwright (Chromium) launches a headless browser to load the test page.
  - **Test Page**: A dynamically generated HTML file (`temp-client-export.html`) served from the root. It imports the player and instantiates it with a `src` pointing to the *built* example artifact (`output/example-build/...`).
- **Pseudo-Code**:
  ```typescript
  import { createServer } from 'vite';
  import { chromium } from 'playwright';
  import * as fs from 'fs/promises';
  import * as path from 'path';

  async function verify() {
    // 1. Verify Prerequisites
    // Check if 'output/example-build/examples/simple-animation/composition.html' exists.
    // If not, fail with "Run npm run build:examples first".

    // 2. Start Vite Server
    // Serve root (process.cwd()) on a random port (e.g., 3000).
    // Config: root: '.', server: { port: 3000 }
    const server = await createServer({ ... });
    await server.listen();

    // 3. Create Temporary Test Page
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <!-- Import Player Source directly (handled by Vite) -->
        <script type="module" src="/packages/player/src/index.ts"></script>

        <!-- Player Component -->
        <!-- Pointing to the BUILT artifact for the composition -->
        <helios-player
          id="player"
          src="/output/example-build/examples/simple-animation/composition.html"
          width="800"
          height="600"
          export-format="mp4"
          controls
        ></helios-player>
      </body>
      </html>
    `;
    await fs.writeFile('temp-client-export.html', testHtml);

    // 4. Launch Browser & Test
    const browser = await chromium.launch({ headless: true }); // WebCodecs usually works in headless
    const page = await browser.newPage();

    // Setup Download Listener
    const downloadPromise = page.waitForEvent('download');

    try {
      await page.goto('http://localhost:3000/temp-client-export.html');

      // Wait for player to be defined and ready
      await page.waitForSelector('helios-player');

      // Wait for the "Export" button in Shadow DOM to be enabled
      // Note: We might need to wait for metadata load
      // Locator: helios-player >> .export-btn

      // Click Export
      await page.locator('helios-player >> .export-btn').click();

      console.log('Export initiated...');

      // Wait for download to start (timeout 30s)
      const download = await downloadPromise;

      // Save download
      const outputPath = path.resolve('output', 'client-export-verified.mp4');
      await download.saveAs(outputPath);

      // Verify
      const stats = await fs.stat(outputPath);
      if (stats.size > 0) {
        console.log(`✅ Client-side export verified: ${outputPath} (${stats.size} bytes)`);
      } else {
        throw new Error('Exported file is empty');
      }

    } finally {
      // 5. Cleanup
      await browser.close();
      await server.close();
      await fs.unlink('temp-client-export.html').catch(() => {});
    }
  }

  verify().catch(e => {
    console.error(e);
    process.exit(1);
  });
  ```
- **Dependencies**:
  - `npm run build:examples` must be executed prior to running this test script. The executor must ensure this.

#### 4. Test Plan
- **Verification**:
  1. Ensure dependencies are installed: `npm install`.
  2. Build examples: `npm run build:examples`.
  3. Run the verification script: `npx tsx tests/e2e/verify-client-export.ts`.
- **Success Criteria**:
  - The script executes without error.
  - A video file `output/client-export-verified.mp4` is created.
  - The file size is greater than 0 bytes.
- **Edge Cases**:
  - **Headless WebCodecs**: If default headless Chrome fails with WebCodecs, add args: `['--enable-features=WebCodecs']`.
  - **Timeout**: Export might take time; ensure Playwright timeouts are generous (e.g., 60s for the download event).
