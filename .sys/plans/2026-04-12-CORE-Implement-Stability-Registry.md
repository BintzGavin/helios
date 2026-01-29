# 2026-04-12-CORE-Implement-Stability-Registry.md

#### 1. Context & Goal
- **Objective**: Implement a `registerStabilityCheck` API in the `Helios` class to allow external consumers (e.g., custom loaders, WebGL renderers) to register asynchronous stability checks.
- **Trigger**: "Headless Logic Engine" vision requires deterministic rendering for *all* content types. Currently, `waitUntilStable` only waits for the `TimeDriver` (DOM elements), ignoring custom logic.
- **Impact**: Enables robust "Client-Side Export" and "Hybrid Composition" rendering by ensuring all assets (including non-DOM ones) are ready before frame capture.

#### 2. File Inventory
- **Modify**: `packages/core/src/index.ts` (Implement `registerStabilityCheck` and update `waitUntilStable`)
- **Create**: `packages/core/src/stability.test.ts` (Verify registry logic)
- **Read-Only**: `packages/core/src/drivers/TimeDriver.ts` (Interface reference)

#### 3. Implementation Spec
- **Architecture**: Observer Pattern. `Helios` maintains a `Set` of async functions.
- **Types**:
  ```typescript
  export type StabilityCheck = () => Promise<void>;
  ```
- **Pseudo-Code (`Helios` class)**:
  ```typescript
  class Helios {
    private _stabilityChecks = new Set<StabilityCheck>();

    /**
     * Registers a custom stability check.
     * The check function should return a Promise that resolves when the custom system is stable.
     * @returns A disposal function to unregister the check.
     */
    public registerStabilityCheck(check: StabilityCheck): () => void {
      this._stabilityChecks.add(check);
      return () => this._stabilityChecks.delete(check);
    }

    public async waitUntilStable() {
      // 1. Wait for the primary driver (e.g., DomDriver)
      const driverPromise = this.driver.waitUntilStable();

      // 2. Wait for all custom checks in parallel
      const checkPromises = Array.from(this._stabilityChecks).map(check => check());

      await Promise.all([driverPromise, ...checkPromises]);
    }

    public dispose() {
       // ... existing disposal ...
       this._stabilityChecks.clear();
    }
  }
  ```
- **Public API Changes**:
  - Export `StabilityCheck` type.
  - New public method `registerStabilityCheck` on `Helios`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - `packages/core/src/stability.test.ts` passes.
    - Test case: Register a check that delays for 50ms. `waitUntilStable` takes > 50ms.
    - Test case: Unregister check. `waitUntilStable` takes < 50ms.
    - Test case: `dispose()` clears checks.
    - Test case: Multiple checks run in parallel.
- **Edge Cases**:
    - Verify error propagation: If a custom check rejects, `waitUntilStable` should reject.
