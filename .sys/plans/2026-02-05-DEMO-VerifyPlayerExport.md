# Plan: Dynamic Player Export Verification

## 1. Context & Goal
- **Objective**: Create a new E2E test `tests/e2e/verify-player-export.ts` that iterates through all examples, loads them into `<helios-player>`, and verifies that the client-side export (WebCodecs) triggers a file download.
- **Trigger**: The vision states "Client-Side WebCodecs as Primary Export", but currently we only verify this path for a single API example. We need broad coverage to ensure the "Primary" path is robust across all composition types (DOM, Canvas, etc.).
- **Impact**: Increases confidence in the client-side export feature, ensuring it works for React, Vue, Svelte, and Vanilla examples.

## 2. File Inventory
- **Create**: `tests/e2e/verify-player-export.ts`
- **Modify**: `tests/e2e/verify-all.ts`
- **Read-Only**: `tests/e2e/verify-render.ts`, `tests/e2e/fixtures/player.html`, `vite.build-example.config.js`

## 3. Implementation Spec
- **Architecture**:
    - Use Playwright with a local Node.js static server (serving project root).
    - Reuse `tests/e2e/fixtures/player.html` as the harness.
    - Logic:
        1. Discover all examples (checking for `composition.html` in `examples/`).
        2. Launch Browser & Server.
        3. For each example:
            a. Verify build artifact exists (`output/example-build/examples/${name}/composition.html`).
            b. Navigate to `http://localhost:${PORT}/tests/e2e/fixtures/player.html`.
            c. Set `<helios-player src="...">`.
            d. Click "Export" button in Shadow DOM (`.export-btn`).
            e. Wait for `download` event.
            f. Verify download completes (stream is readable).
- **Pseudo-Code**:
    ```typescript
    // verify-player-export.ts
    import { chromium } from '@playwright/test';
    import * as http from 'http';
    import * as fs from 'fs';
    import * as path from 'path';

    // Copy discoverCases logic from verify-render.ts
    // Copy static server logic from verify-player.ts

    async function main() {
       const cases = await discoverCases();
       const server = startServer(ROOT_DIR, 4176);
       const browser = await chromium.launch();

       for (const testCase of cases) {
           const page = await browser.newPage();
           await page.goto('http://localhost:4176/tests/e2e/fixtures/player.html');

           // Update src
           const compositionUrl = `/output/example-build/${testCase.relativePath}`;
           await page.evaluate((src) => {
               document.querySelector('helios-player').setAttribute('src', src);
           }, compositionUrl);

           // Wait for load
           await page.waitForTimeout(1000); // Give it a moment to load metadata

           // Click Export
           // Selector verified in packages/player/src/index.ts: class="export-btn"
           const [download] = await Promise.all([
               page.waitForEvent('download'),
               page.locator('helios-player >> .export-btn').click()
           ]);

           // Success if download starts
           await download.path();
           console.log(`✅ ${testCase.name} Exported successfully!`);
       }
    }
    ```
- **Dependencies**: Depends on `npm run build:examples` (which is already run in `verify-all.ts`).
- **Public API Changes**: None.

## 4. Test Plan
- **Verification**: `npm run verify:e2e` (which will run the new script via `verify-all.ts`).
- **Success Criteria**: The script iterates all examples and prints "✅ [Example Name] Exported successfully!" for each.
- **Edge Cases**:
    - Export failure (timeout or error dialog in player).
    - Browser support (Playwright uses headless Chromium, which should support WebCodecs).
    - Filter argument (`process.argv[2]`) should be supported to run single test.
