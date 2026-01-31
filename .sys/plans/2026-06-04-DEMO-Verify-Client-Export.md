# 📋 Plan: Upgrade Client-Side Export Verification

## 1. Context & Goal
- **Objective**: Upgrade the Client-Side Export verification from a single static example to a dynamic discovery of all examples, matching the robustness of the Server-Side verification.
- **Trigger**: The `.jules/DEMO.md` journal identified a parity gap: "Client-Side Export" is a "Primary" feature but has weak verification coverage compared to the "Secondary" Server-Side path.
- **Impact**: Ensures that the Client-Side Export feature (WebCodecs) works reliably across all framework adapters and example types, increasing confidence in the primary export path.

## 2. File Inventory
- **Create**:
  - `tests/e2e/fixtures/dynamic-player.html`: A generic test fixture that accepts a composition URL via a `src` query parameter.
- **Modify**:
  - `tests/e2e/verify-client-export.ts`: Rewrite to discover all examples (mirroring `verify-render.ts` logic) and verify export functionality for each using the dynamic player fixture.
- **Read-Only**:
  - `tests/e2e/verify-render.ts`: For reference on example discovery logic.
  - `tests/e2e/verify-player.ts`: For reference on static server logic.

## 3. Implementation Spec
- **Architecture**:
  - The script will act as an orchestrator using `Playwright` and a local Node.js `http` server.
  - **Server**: Spawns on port `4176` (safe port) serving the project root to allow access to `output/example-build/` artifacts and fixtures.
  - **Discovery**: dynamically scans `examples/` for directories containing `composition.html`, constructing a list of test cases.
  - **Verification Loop**:
    1. Launch Headless Chromium.
    2. Iterate through each discovered example.
    3. Navigate to `http://localhost:4176/tests/e2e/fixtures/dynamic-player.html?src=/output/example-build/examples/[name]/composition.html`.
    4. Wait for `<helios-player>` to connect.
    5. Click the export button (located in Shadow DOM `.export-btn`).
    6. Intercept the `download` event.
    7. Verify the download started and has a valid filename/size.
    8. Report pass/fail.
- **Pseudo-Code (verify-client-export.ts)**:
  ```typescript
  import { chromium } from '@playwright/test';
  // ... imports for fs, path, http ...

  // 1. Start Server on 4176
  const server = http.createServer(...);

  // 2. Discover Cases
  const cases = discoverCases(); // same logic as verify-render.ts

  // 3. Run Tests
  const browser = await chromium.launch();
  for (const testCase of cases) {
      const page = await browser.newPage();
      await page.goto(`http://localhost:4176/tests/e2e/fixtures/dynamic-player.html?src=...`);

      // Wait for player ready
      await page.waitForSelector('helios-player');

      // Trigger Export
      const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.locator('helios-player >> .export-btn').click()
      ]);

      // Verify
      if (download) console.log(`✅ ${testCase.name} Exported`);
  }
  ```

## 4. Test Plan
- **Verification**:
  1. Ensure examples are built: `npm run build:examples`.
  2. Run the script: `npx tsx tests/e2e/verify-client-export.ts`.
- **Success Criteria**:
  - The script lists all discovered examples (approx 20+).
  - Each example logs a success message after triggering export.
  - Final output confirms "✅ All examples verified successfully!".
- **Edge Cases**:
  - **Timeout**: Large examples might take longer to export; increase Playwright timeout.
  - **Missing Build**: Script should check if `output/example-build` exists and warn if not.
  - **Environment**: Requires `npm run build -w packages/player` to ensure the player bundle exists.
