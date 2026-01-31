# Plan: Verify Client-Side Export

## 1. Context & Goal
- **Objective**: Create an E2E test to verify the "Client-Side Export" feature (WebCodecs) using the `examples/client-export-api` example.
- **Trigger**: Vision gap identified in `.jules/DEMO.md`: "The 'Client-Side Export' feature... had zero automated E2E coverage."
- **Impact**: Ensures the primary export path (WebCodecs) is functional and prevents regressions in the client-side export workflow.

## 2. File Inventory
- **Create**: `tests/e2e/verify-client-export.ts`
- **Read-Only**: `vite.build-example.config.js` (confirms output path), `examples/client-export-api/index.html`

## 3. Implementation Spec
- **Architecture**:
    - The test will be a standalone TypeScript script runnable via `npx ts-node`.
    - It requires `npm run build:examples` to have been executed.
    - It confirms the existence of the build output directory `output/example-build` (as defined in `vite.build-example.config.js`).
    - It spawns a local static server using `vite preview` to serve the built examples from `output/example-build`.
    - It uses Playwright (`chromium`) to launch a headless browser and verify the export flow.

- **Pseudo-Code**:
    ```typescript
    import { chromium } from '@playwright/test';
    import { spawn } from 'child_process';
    import path from 'path';
    import fs from 'fs';

    const BUILD_DIR = 'output/example-build'; // Checked from vite.build-example.config.js

    // 1. Check if BUILD_DIR exists; if not, exit with error "Please run npm run build:examples"
    // 2. Start `npx vite preview --outDir output/example-build --port 4173`
    // 3. Wait for server readiness (poll http://localhost:4173)
    // 4. Launch Playwright: await chromium.launch()
    // 5. Navigate to http://localhost:4173/examples/client-export-api/index.html
    // 6. Listen for console logs to confirm "Controller and Exporter initialized"
    // 7. Click "#export-btn"
    // 8. Wait for download event: page.waitForEvent('download')
    // 9. Assert download occurs and filename ends with .mp4
    // 10. Assert UI progress text becomes "Done!"
    // 11. Clean up: close browser, kill server
    ```

- **Dependencies**:
    - `@playwright/test` (available)
    - `vite` (available)

## 4. Test Plan
- **Verification**: `npx ts-node tests/e2e/verify-client-export.ts`
- **Success Criteria**:
    - Script launches server and browser.
    - Script successfully clicks export and detects download.
    - Script exits with success message.
- **Edge Cases**:
    - Build artifacts missing (handled by existence check).
    - Port 4173 in use (should ideally use random port or handle error, but 4173 is standard Vite preview port; can use `--strictPort false` or 0 if needed, but standard port is fine for verification).
