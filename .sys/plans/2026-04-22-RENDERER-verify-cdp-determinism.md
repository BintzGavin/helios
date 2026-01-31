#### 1. Context & Goal
- **Objective**: Verify that `CdpTimeDriver` ensures deterministic `Date.now()` and `performance.now()` values across runs by verifying fixed epoch initialization.
- **Trigger**: Vision Gap - The "Deterministic Rendering" feature (specifically for CdpTimeDriver) lacks a dedicated verification test, leaving it prone to regressions.
- **Impact**: Ensures that Canvas-based rendering (which uses CdpTimeDriver) produces bit-identical output for time-dependent animations on every machine.

#### 2. File Inventory
- **Create**: `packages/renderer/tests/verify-cdp-driver-determinism.ts` (Test script for CdpTimeDriver determinism)
- **Modify**: `packages/renderer/tests/run-all.ts` (Add the new test to the suite)
- **Read-Only**: `packages/renderer/src/drivers/CdpTimeDriver.ts`, `packages/renderer/tests/verify-seek-driver-determinism.ts`

#### 3. Implementation Spec
- **Architecture**: Duplicate the pattern from `verify-seek-driver-determinism.ts` but adapt it for `CdpTimeDriver`.
- **Pseudo-Code**:
  - IMPORT `chromium`, `CdpTimeDriver`.
  - CONST `FIXED_EPOCH` = 1704067200000.
  - FUNCTION `main`:
    - LAUNCH browser, create page.
    - INIT `CdpTimeDriver`.
    - GOTO data-url page with logging script (logs `Date.now`, `performance.now`, `raf`).
    - CALL `driver.prepare(page)`.
    - LOOP 10 frames:
      - CALL `driver.setTime(page, time)`.
    - GET logs from page.
    - ASSERT `logs[0].date` is close to `FIXED_EPOCH`.
    - ASSERT `raf` timestamps match `performance.now`.
    - ASSERT `performance.now` matches set time.
  - MODIFY `run-all.ts`:
    - ADD `'tests/verify-cdp-driver-determinism.ts'` to `tests` array.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-cdp-driver-determinism.ts`
- **Success Criteria**: Output "✅ SUCCESS: CdpTimeDriver is deterministic." and process exits with 0.
- **Edge Cases**: Verify that `Date.now()` is exactly (or very close to) the fixed epoch at t=0, ensuring no wall-clock drift leaks in.
