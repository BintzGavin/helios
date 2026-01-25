# Context & Goal
- **Objective**: Abstract the source of time (Clock and Loop) from the `Helios` class into the `TimeDriver` interface.
- **Trigger**: Roadmap "Architecture Hardening: TimeDriver Abstraction" and journal entry "TimeDriver Abstraction Needed".
- **Impact**: Decouples `Helios` from browser globals (`performance.now`, `requestAnimationFrame`), enabling headless environments (Node.js), deterministic testing, and alternate timing strategies (e.g., manual stepping).

# File Inventory
- **Modify**: `packages/core/src/drivers/TimeDriver.ts` (Add `now`, `requestFrame`, `cancelFrame` to interface)
- **Modify**: `packages/core/src/drivers/WaapiDriver.ts` (Implement new methods using browser globals)
- **Modify**: `packages/core/src/drivers/NoopDriver.ts` (Implement new methods using browser globals)
- **Modify**: `packages/core/src/index.ts` (Update `Helios` to use `this.driver` for timing/looping)
- **Modify**: `packages/core/src/index.test.ts` (Update mock drivers and verify new behavior)

# Implementation Spec

## Architecture
Expand `TimeDriver` from a "Sink" (receiving time updates) to a "Source & Sink" (providing time and loop control).
This consolidates timing responsibility into the driver, allowing `Helios` to be environment-agnostic.

## Interface Changes
Update `packages/core/src/drivers/TimeDriver.ts`:

```typescript
export interface TimeDriver {
  // Existing (Sink)
  init(scope: HTMLElement | Document): void;
  update(timeInMs: number): void;

  // New (Source)
  now(): number; // Abstract performance.now()
  requestFrame(callback: (time: number) => void): number; // Abstract requestAnimationFrame
  cancelFrame(id: number): void; // Abstract cancelAnimationFrame
}
```

## Driver Implementation Logic
Both `WaapiDriver` and `NoopDriver` will implement the source methods using standard browser globals.

**Shared Logic (duplicate for now to avoid creating new files):**
```typescript
  now(): number {
    return performance.now();
  }

  requestFrame(callback: (time: number) => void): number {
    return requestAnimationFrame(callback);
  }

  cancelFrame(id: number): void {
    cancelAnimationFrame(id);
  }
```
*Note: `NoopDriver` is used when `autoSyncAnimations` is false. It MUST provide a loop for Helios to function, so it behaves as a "RafDriver".*

## Helios Refactor
In `packages/core/src/index.ts`:

1.  **Remove Globals**: Remove usage of `requestAnimationFrame`, `cancelAnimationFrame`, `performance.now`.
2.  **Play**:
    ```typescript
    public play() {
      // ...
      this.lastFrameTime = this.driver.now();
      this.animationFrameId = this.driver.requestFrame(this.tick);
    }
    ```
3.  **Pause**:
    ```typescript
    public pause() {
      // ...
      if (this.animationFrameId) {
        this.driver.cancelFrame(this.animationFrameId);
        // ...
      }
    }
    ```
4.  **Tick**:
    ```typescript
    private tick = () => {
       // ...
       const now = this.driver.now();
       // ...
       this.animationFrameId = this.driver.requestFrame(this.tick);
    }
    ```

# Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - All existing tests pass.
    - `Helios` logic is decoupled from globals.
- **Specific Test Updates (`packages/core/src/index.test.ts`)**:
    - Update `mockDriver` object to include `now`, `requestFrame`, `cancelFrame`.
    - Verify that `Helios` calls `driver.requestFrame` instead of relying on `vi.stubGlobal('requestAnimationFrame')` (though stubs might still be needed for the driver implementation itself).
    - Add a test case where a custom driver (e.g., `ManualDriver`) controls the loop, proving decoupling.
