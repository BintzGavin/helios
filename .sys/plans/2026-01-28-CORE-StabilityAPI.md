# 2026-01-28-CORE-StabilityAPI.md

#### 1. Context & Goal
- **Objective**: Implement a `registerStabilityCheck` API in `Helios` to allow external systems (e.g. Three.js loaders, Data Fetchers) to delay the `waitUntilStable` promise.
- **Trigger**: "Headless Logic Engine" vision requires deterministic rendering for *all* content types, not just DOM (which is currently handled by `DomDriver`).
- **Impact**: Enables robust "Client-Side Export" and "Hybrid Composition" rendering by ensuring all assets are ready before frame capture.

#### 2. File Inventory
- **Modify**: `packages/core/src/helios.ts` (Implement logic)
- **Create**: `packages/core/src/stability.test.ts` (Verify logic)
- **Read-Only**: `packages/core/src/drivers/TimeDriver.ts` (Interface reference)

#### 3. Implementation Spec
- **Architecture**: Observer Pattern. `Helios` maintains a `Set` of async functions.
- **Pseudo-Code**:
  ```typescript
  class Helios {
    private _stabilityChecks = new Set<() => Promise<void>>();

    /**
     * Registers a custom stability check.
     * The check function should return a Promise that resolves when the custom system is stable.
     * @returns A disposal function to unregister the check.
     */
    public registerStabilityCheck(check: () => Promise<void>): () => void {
      this._stabilityChecks.add(check);
      return () => this._stabilityChecks.delete(check);
    }

    public async waitUntilStable() {
      // 1. Wait for the primary driver (e.g., DomDriver)
      await this.driver.waitUntilStable();

      // 2. Wait for all custom checks in parallel
      if (this._stabilityChecks.size > 0) {
        await Promise.all(Array.from(this._stabilityChecks).map(check => check()));
      }
    }

    public dispose() {
       // ... existing disposal ...
       this._stabilityChecks.clear();
    }
  }
  ```
- **Public API Changes**: New public method `registerStabilityCheck`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - `packages/core/src/stability.test.ts` passes.
    - Test case: Register a check that delays for 50ms. `waitUntilStable` takes > 50ms.
    - Test case: Unregister check. `waitUntilStable` takes < 50ms.
    - Test case: `dispose()` clears checks.
- **Edge Cases**:
    - Verify error propagation: If a custom check rejects, `waitUntilStable` should reject.
