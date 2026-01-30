# Plan: Verify Client-Side Export

#### 1. Context & Goal
- **Objective**: Implement an End-to-End (E2E) test to verify the Client-Side Export feature (WebCodecs) within the `HeliosPlayer` component.
- **Trigger**: The "Client-Side WebCodecs as Primary Export" vision is a key roadmap item, but currently lacks automated verification in the E2E pipeline.
- **Impact**: Ensures the stability and functionality of the browser-based export mechanism, preventing regressions in a critical user-facing feature.

#### 2. File Inventory
- **Create**:
  - `tests/e2e/verify-client-export.ts`: A new TypeScript script using Playwright to drive the verification process.
- **Modify**:
  - `vite.build-example.config.js`: Update the build configuration to include `examples/simple-animation/index.html` (the player wrapper) in the build output, ensuring a testable artifact exists.
- **Read-Only**:
  - `examples/simple-animation/index.html`: The source file being built.
  - `packages/player/src/features/exporter.ts`: The underlying export logic (for reference).

#### 3. Implementation Spec
- **Architecture**:
  - The test will be a standalone Node.js script executed via `tsx`.
  - It will leverage `playwright` (Chromium) in headless mode.
  - It requires `examples/simple-animation/index.html` to be built into `output/example-build/examples/simple-animation/index.html`.
  - It will use `npx vite preview` to serve the `output/example-build` directory, avoiding CORS issues associated with `file://` protocol and ES modules.
- **Pseudo-Code**:
  ```typescript
  import { chromium } from 'playwright';
  import { spawn } from 'child_process';

  // 1. Build Examples (ensure up-to-date)
  // execSync('npm run build:examples');

  // 2. Start Static Server
  const server = spawn('npx', ['vite', 'preview', '--outDir', 'output/example-build', '--port', '3000']);
  // Wait for server ready...

  // 3. Launch Browser
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 4. Navigate to Player Example
  await page.goto('http://localhost:3000/examples/simple-animation/index.html');

  // 5. Interact with Shadow DOM
  const player = page.locator('helios-player');
  const exportBtn = player.locator('button.export-btn'); // inside shadow root

  // 6. Trigger Export
  const downloadPromise = page.waitForEvent('download');
  await exportBtn.click();
  const download = await downloadPromise;

  // 7. Verify
  const path = await download.path();
  // Check file exists and size > 0

  // 8. Cleanup
  await browser.close();
  server.kill();
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build:examples` followed by `npx tsx tests/e2e/verify-client-export.ts`.
- **Success Criteria**: The script should exit with code 0 and log a success message indicating the video was exported and verified.
- **Edge Cases**:
  - Server startup failure (port in use).
  - Browser crash.
  - Export timeout (if rendering is too slow).
  - Missing build artifacts (should fail fast).
