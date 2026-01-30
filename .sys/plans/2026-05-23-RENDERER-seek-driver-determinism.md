# Context & Goal
* **Objective**: Enforce deterministic `Date.now()` in `SeekTimeDriver` by fixing the epoch to Jan 1, 2024.
* **Trigger**: Current `SeekTimeDriver` uses wall-clock `Date.now()` as the anchor, causing inconsistent renders across different runs.
* **Impact**: Enables bit-exact reproduction of videos relying on `Date` objects, aligning `DomStrategy` with `CdpTimeDriver`.

# File Inventory
* **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
* **Modify**: `packages/renderer/tests/verify-seek-driver-determinism.ts`

# Implementation Spec
* **Architecture**: The `TimeDriver` MUST control the environment's clock completely. We replace the relative anchor (`Date.now()`) with a constant absolute anchor.
* **Pseudo-Code (SeekTimeDriver.ts)**:
  ```typescript
  // In init(page):
  // REPLACE: const initialDate = Date.now();
  // WITH: const initialDate = 1704067200000; // 2024-01-01T00:00:00.000Z
  ```
* **Pseudo-Code (verify-seek-driver-determinism.ts)**:
  ```typescript
  // Add constant:
  const FIXED_EPOCH = 1704067200000;

  // In verification logic (after collecting logs):
  // Check 4: Date.now() must be anchored to FIXED_EPOCH
  // Since the first frame is at time=0, logs[0].date should equal FIXED_EPOCH
  const firstLog = logs.find(l => l.perf === 0);
  if (firstLog) {
      if (Math.abs(firstLog.date - FIXED_EPOCH) > 100) { // Allow small delta if needed, though exact is expected
          console.error('❌ Date.now() anchor mismatch: Expected ' + FIXED_EPOCH + ', got ' + firstLog.date);
          failures++;
      }
  }
  ```

# Test Plan
* **Verification**: `npx ts-node packages/renderer/tests/verify-seek-driver-determinism.ts`
* **Success Criteria**: The test script must run without errors and print "✅ SUCCESS".
