# 2026-05-26-CORE-Expose-Duration-FPS-Signals.md

#### 1. Context & Goal
- **Objective**: Expose `duration` and `fps` properties in the `Helios` class as `ReadonlySignal<number>` instead of raw `number` values.
- **Trigger**: The vision describes a "Headless State Machine ... via reactive Signals". Currently, `duration` and `fps` are the only state properties exposed as raw values, preventing fine-grained subscription and creating API inconsistency.
- **Impact**: Enables consumers to reactively update UI when duration or FPS changes (e.g., via `setDuration`) without subscribing to the entire state object. This unifies the API surface. **Note:** This is a breaking change for consumers accessing `helios.duration` directly (must now use `helios.duration.value`).

#### 2. File Inventory
- **Modify**: `packages/core/src/index.ts` (Update getters)
- **Modify**: `packages/core/src/index.test.ts` (Update tests to access `.value`)
- **Modify**: `packages/core/src/index-signals.test.ts` (Add signal verification tests)

#### 3. Implementation Spec
- **Architecture**:
  - The `Helios` class already maintains `_duration` and `_fps` as `Signal<number>` internally (lines 98-99).
  - The public getters `duration` and `fps` currently return `this._duration.value` and `this._fps.value`.
  - The plan is to change these getters to return `this._duration` and `this._fps` (typed as `ReadonlySignal<number>`).
  - `getState()` will continue to return a snapshot object with raw values (`duration: number`), so `HeliosState` interface remains unchanged.

- **Public API Changes**:
  ```typescript
  // Before
  public get duration(): number;
  public get fps(): number;

  // After
  public get duration(): ReadonlySignal<number>;
  public get fps(): ReadonlySignal<number>;
  ```

- **Pseudo-Code (index.ts)**:
  ```typescript
  class Helios {
    // ...
    // Update getter to return ReadonlySignal
    public get duration(): ReadonlySignal<number> { return this._duration; }
    public get fps(): ReadonlySignal<number> { return this._fps; }
    // ...
  }
  ```

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - All existing tests pass (after updating them to use `.value` where they access `helios.duration` or `helios.fps`).
  - New tests in `index-signals.test.ts` confirm `duration` and `fps` are subscribe-able and update correctly when `setDuration`/`setFps` are called.
- **Edge Cases**:
  - Verify that `getState().duration` is still a number (snapshot).
  - Verify that `setDuration` updates the signal value.
