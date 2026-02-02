# Context & Goal

- **Objective**: Enforce deterministic `performance.now()` in `CdpTimeDriver` (Canvas Mode) to prevent animation drift caused by variable page load times.
- **Trigger**: `performance.now()` currently measures time since navigation start. Because page load time (network/parsing) is variable, `performance.now()` at the start of rendering (Frame 0) varies across runs, causing drift in time-based animations (e.g. `Three.js` clock).
- **Impact**: Ensures that Canvas-based renders are bit-identical across different runs and environments, fulfilling the "Deterministic Rendering" vision.

# File Inventory

- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts` (Inject polyfill in `prepare`)
- **Modify**: `packages/renderer/tests/verify-cdp-determinism.ts` (Add verification checks)
- **Read-Only**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Reference for polyfill behavior)

# Implementation Spec

## Architecture

- **Pattern**: Polyfill Injection.
- **Mechanism**:
  - `CdpTimeDriver` already freezes `Date.now()` to a fixed epoch (Jan 1, 2024) using CDP's `Emulation.setVirtualTimePolicy`.
  - We will inject a script in `prepare()` (immediately after setting the policy) to override `window.performance.now()` to return `Date.now() - FIXED_EPOCH`.
  - This effectively rebases `performance.now()` to start at 0 (virtual time) regardless of how long the actual page load took.

## Pseudo-Code

**`packages/renderer/src/drivers/CdpTimeDriver.ts`**

```text
CONST INITIAL_VIRTUAL_TIME = 1704067200 (Seconds)
CONST INITIAL_VIRTUAL_TIME_MS = 1704067200000 (Milliseconds)

METHOD prepare(page):
  CALL client = page.context().newCDPSession(page)

  // existing CDP logic
  CALL client.send('Emulation.setVirtualTimePolicy', {
    policy: 'pause',
    initialVirtualTime: INITIAL_VIRTUAL_TIME
  })

  // NEW: Override performance.now to match virtual time
  CALL page.evaluate((epoch) => {
    // Force performance.now() to be derived from the deterministic Date.now()
    // Since Date.now() is frozen at EPOCH, (Date.now() - EPOCH) will be 0 at start.
    // As CDP advances time, Date.now() advances, and so will performance.now().
    window.performance.now = () => Date.now() - epoch
  }, INITIAL_VIRTUAL_TIME_MS)

  SET currentTime = 0
```

**`packages/renderer/tests/verify-cdp-determinism.ts`**

```text
FUNCTION runSession():
  // ... launch browser ...
  // ... prepare driver ...

  LOOP timesToCheck:
    CALL driver.setTime(t)
    GET now = page.evaluate(() => Date.now())
    GET perf = page.evaluate(() => performance.now()) // NEW
    PUSH { now, perf } to results

  RETURN results

FUNCTION verify():
  RUN session 1
  RUN session 2

  // Verify Consistency
  ASSERT run1[i].perf === run2[i].perf

  // Verify Anchor
  ASSERT run1[0].perf is approximately 0 (allow small delta but must be deterministic)
```

## Public API Changes

- None. This is an internal fix to `CdpTimeDriver`.

## Dependencies

- None.

# Test Plan

## Verification

- **Command**: `npx tsx packages/renderer/tests/verify-cdp-determinism.ts`

## Success Criteria

1.  **Consistency**: Run 1 `performance.now()` values match Run 2 values exactly.
2.  **Accuracy**: `performance.now()` at Frame 0 (t=0) is close to 0 (e.g. < 50ms), ignoring the actual page load time (which takes > 500ms).

## Edge Cases

- **High Precision**: `performance.now()` is usually microsecond precision. `Date.now()` is millisecond. We accept 1ms precision as the trade-off for determinism in this implementation.
- **Negative Time**: If `Date.now()` somehow is before Epoch? Unlikely as we set it. But `Date.now() - Epoch` ensures relative time.
