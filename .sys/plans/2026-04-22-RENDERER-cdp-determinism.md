# Context & Goal
- **Objective**: Enforce deterministic `Date.now()` in `CdpTimeDriver` (Canvas Mode) by initializing `Emulation.setVirtualTimePolicy` with a fixed epoch.
- **Trigger**: Vision gap. `CdpTimeDriver` currently relies on system time for `Date.now()`, causing non-deterministic rendering across runs.
- **Impact**: Ensures that time-based animations (using `Date.now()`) are consistent frame-by-frame, regardless of when the render job starts. Improves reliability for regression testing and "Production Rendering".

# File Inventory
- **Create**:
  - `packages/renderer/tests/verify-cdp-determinism.ts`: Verification script to assert `Date.now()` consistency.
- **Modify**:
  - `packages/renderer/src/drivers/CdpTimeDriver.ts`: Update `prepare(page)` to set `initialVirtualTime`.
- **Read-Only**:
  - `packages/renderer/src/drivers/SeekTimeDriver.ts`: Reference for existing time behavior.

# Implementation Spec
- **Architecture**:
  - `CdpTimeDriver` currently calls `Emulation.setVirtualTimePolicy({ policy: 'pause' })` but omits `initialVirtualTime`.
  - We will set `initialVirtualTime` to a fixed constant (e.g., `1704067200` seconds / `1704067200000` ms, representing Jan 1, 2024).
  - This anchors the virtual timeline to a known start point, making `Date.now()` predictable.
  - **Verify Unit**: Check if `initialVirtualTime` expects seconds (Unix timestamp) or milliseconds. CDP usually expects seconds for `TimeSinceEpoch`. If unsure, test with both and verify `Date.now()` output.

- **Pseudo-Code**:
  - In `CdpTimeDriver.prepare(page)`:
    - Define `const INITIAL_VIRTUAL_TIME = 1704067200; // Jan 1, 2024 (Seconds)`
    - Call `client.send('Emulation.setVirtualTimePolicy', { policy: 'pause', initialVirtualTime: INITIAL_VIRTUAL_TIME });`
    - (Wait, `budget` is usually ms. Verify if `initialVirtualTime` is also ms or seconds. If `Date.now()` is ms, maybe `initialVirtualTime` is also ms?)

- **Public API Changes**: None.

- **Dependencies**: None.

# Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-cdp-determinism.ts`
  - Create this script. It should:
    1. Import `Renderer` from `../src/index`.
    2. Instantiate `Renderer` with `{ mode: 'canvas', width: 100, height: 100, fps: 1, durationInSeconds: 1 }`.
    3. Run `renderer.timeDriver.prepare(page)`.
    4. Inject script: `return Date.now()`.
    5. Log the value.
    6. Repeat step 2-5 in a loop (2 iterations).
    7. Assert `value1 === value2`.
    8. Also assert `value1` is close to expected epoch (Jan 1, 2024).
- **Success Criteria**: `Date.now()` is identical across runs and matches the fixed epoch.
- **Edge Cases**: Verify `performance.now()` also resets (starts near 0 or consistent).
