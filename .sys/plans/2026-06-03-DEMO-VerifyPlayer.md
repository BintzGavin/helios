# 2026-06-03-DEMO-VerifyPlayer

## 1. Context & Goal
- **Objective**: Add End-to-End (E2E) verification for the `<helios-player>` Web Component to ensure interactive features (Play/Pause, Scrubbing) work in a browser environment.
- **Trigger**: The current E2E suite (`verify-all.ts`) verifies server-side rendering and client-side export but completely skips the Player component, which is the primary developer interface.
- **Impact**: Prevents regressions in the Player UI and ensures the core developer experience remains functional.

## 2. File Inventory
- **Create**:
  - `tests/e2e/verify-player.ts`: Playwright test script to drive the browser interaction.
  - `tests/e2e/fixtures/player.html`: Test harness HTML file to host the player and example composition.
- **Modify**:
  - `tests/e2e/verify-all.ts`: Update to include `packages/player` build step and execute the new test script.
- **Read-Only**:
  - `packages/player/dist/`: Built artifacts (target of verification).
  - `packages/core/dist/`: Core library (dependency).
  - `output/example-build/`: Built examples.

## 3. Implementation Spec

### Architecture
- **Fixture Strategy**: Use a static HTML file (`tests/e2e/fixtures/player.html`) that uses an **Import Map** to map `@helios-project/core` to the local `dist/index.js` path. This allows loading the `helios-player.bundle.mjs` (ESM build) directly in the browser without a bundler.
- **Server Strategy**: The test script will spawn a static file server (e.g., `npx http-server` or `python3 -m http.server`) at the **repository root**. This enables the fixture to resolve paths to `packages/` and `output/` using root-relative URLs.

### Detailed Implementation

#### `tests/e2e/fixtures/player.html`
- **Imports**:
  ```html
  <script type="importmap">
  {
    "imports": {
      "@helios-project/core": "/packages/core/dist/index.js"
    }
  }
  </script>
  <script type="module" src="/packages/player/dist/helios-player.bundle.mjs"></script>
  ```
- **Body**:
  - `<helios-player src="/output/example-build/examples/simple-animation/composition.html" width="800" height="600" controls></helios-player>`
  - Uses `simple-animation` as the reliable target.

#### `tests/e2e/verify-player.ts`
- **Setup**:
  - Start static server on port `4175` serving the current directory (`.`).
  - Launch Playwright (Chromium).
- **Test Steps**:
  1. Navigate to `http://localhost:4175/tests/e2e/fixtures/player.html`.
  2. Wait for `<helios-player>` to upgrade and attach shadow DOM.
  3. Locate `.play-pause-btn` inside shadow DOM.
  4. Assert `currentTime` (via `.time-display` or DOM property) is `0` or near `0`.
  5. Click Play.
  6. Wait 2 seconds.
  7. Assert `currentTime` has advanced (`> 0.5`).
  8. Click Pause.
  9. Assert player is paused (button text/icon changes, time stops advancing).
- **Teardown**: Kill server and browser.

#### `tests/e2e/verify-all.ts`
- Add step `0.1`: `npm run build -w packages/player` (ensure player is built).
- Add step `4`: Verify Player (`npx tsx tests/e2e/verify-player.ts`).

### Dependencies
- Requires `packages/core` and `packages/renderer` to be built (already handled in step 0).
- Requires `examples` to be built (already handled in step 1).
- Requires `packages/player` build (added in this plan).

## 4. Test Plan
- **Verification**: Run `npm run verify:e2e` from the root.
- **Success Criteria**:
  - The build step for `packages/player` succeeds.
  - The `verify-player` script launches, connects, and successfully toggles playback.
  - Terminal output confirms `✅ Player Verification Passed!`.
- **Edge Cases**:
  - Ensure the server port `4175` is available (script should probably use `lsof` or try/catch).
