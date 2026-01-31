# 📋 DEMO: Verify Player Component

## 1. Context & Goal
- **Objective**: Implement automated E2E verification for the `<helios-player>` Web Component to ensure UI interactivity (Play/Pause) works in built artifacts.
- **Trigger**: The current E2E suite (`verify-client-export.ts`) tests the export API but bypasses the Player UI. We lack verification for the primary user interface.
- **Impact**: Ensures that the Player Web Component is functional in production builds, preventing regressions in UI controls.

## 2. File Inventory
- **Modify**: `examples/simple-animation/import-player.js` (Update import to use package name for better build compatibility)
- **Modify**: `vite.build-example.config.js` (Include `simple-animation` in the build inputs)
- **Create**: `tests/e2e/verify-player.ts` (New Playwright test script)
- **Modify**: `tests/e2e/verify-all.ts` (Add the new test to the verification pipeline)
- **Read-Only**: `examples/simple-animation/index.html` (Reference for selector structure), `packages/player/src/index.ts` (Reference for Shadow DOM selectors)

## 3. Implementation Spec

### A. Refactor Example Import
- **File**: `examples/simple-animation/import-player.js`
- **Change**: Replace relative path `../../packages/player/dist/index.js` with package import `@helios-project/player`.
- **Reason**: Allows the Vite build alias to resolve it to `src`, ensuring the example works with `npm run build:examples` without requiring a prior distribution build of the player package.

### B. Update Build Config
- **File**: `vite.build-example.config.js`
- **Logic**: Update the `discoverExamples` function.
- **Details**: Add a check to include `examples/simple-animation/index.html` in the `inputs` object (similar to the existing check for `client-export-api`).
- **Reason**: Ensures `simple-animation/index.html` is processed and emitted to `output/example-build/examples/simple-animation/index.html`.

### C. Create Verification Script
- **File**: `tests/e2e/verify-player.ts`
- **Architecture**: Node.js script spawning a Vite preview server and a Playwright instance.
- **Dependencies**: Requires `npm run build:examples` to be run first (handled by `verify-all.ts`).
- **Pseudo-Code**:
  ```typescript
  // 1. Start 'vite preview' on port 4175 (avoid conflict with 4174)
  // 2. Launch Playwright (chromium)
  // 3. Navigate to 'http://localhost:4175/examples/simple-animation/index.html'
  // 4. Locate the <helios-player> element
  // 5. Pierce Shadow DOM to find controls (selectors verified from packages/player/src/index.ts):
  //    - Play Button: .play-pause-btn
  //    - Time Display: .time-display
  // 6. Assert initial state (Time: 0.00 / 5.00)
  // 7. Click Play Button
  // 8. Wait for Time Display to change (e.g., != "0.00 / 5.00")
  // 9. Click Play Button again (Pause)
  // 10. Verify playback stops (time doesn't change after small delay)
  // 11. Cleanup (close browser, kill server)
  ```

### D. Integrate into Pipeline
- **File**: `tests/e2e/verify-all.ts`
- **Change**: Add a spawn step for `tests/e2e/verify-player.ts` after the client export verification step.
- **Log**: "🎥 Step 4: Verifying Player Component..."

## 4. Test Plan
- **Verification**: Run `npm run verify:e2e` from the root.
- **Success Criteria**:
  - The build step succeeds and produces `output/example-build/examples/simple-animation/index.html`.
  - The `verify-player.ts` script executes without error.
  - The console output shows "✅ Player verification passed!" (or similar).
  - The full pipeline (`verify-all.ts`) exits with code 0.
- **Edge Cases**:
  - **Port Conflict**: Ensure port 4175 is free or handle EADDRINUSE (though 4175 is chosen to be distinct).
  - **Shadow DOM**: Playwright automatically pierces Shadow DOM, but explicit `.locator('helios-player >> .play-pause-btn')` syntax may be needed if auto-piercing is ambiguous.
