# Plan: Implement Resolution Awareness in Core

## 1. Context & Goal
- **Objective**: Implement `width` and `height` properties in the `Helios` class and `HeliosState`, along with a `setSize` method and `INVALID_RESOLUTION` error code.
- **Trigger**: A discrepancy between the documented vision ("The Helios core architecture now mandates resolution awareness") and the actual codebase where these properties are missing.
- **Impact**: Enables responsive layouts and proper canvas resizing coordination by making the core logic engine aware of the composition's dimensions.

## 2. File Inventory
- **Modify**: `packages/core/src/index.ts` (Add `width`/`height` to State, Options, and Class; add signals and `setSize` method)
- **Modify**: `packages/core/src/errors.ts` (Add `INVALID_RESOLUTION` to `HeliosErrorCode`)
- **Modify**: `packages/core/src/index.test.ts` (Add unit tests for resolution handling)

## 3. Implementation Spec
- **Architecture**:
  - Extend `HeliosState` to include `width: number` and `height: number`.
  - Extend `HeliosOptions` to include optional `width` (default 1920) and `height` (default 1080).
  - Use `Signal<number>` for internal state management of dimensions.
  - Expose `setSize(width: number, height: number)` public method to update dimensions reactively.
  - Update `getState()` to return the current dimensions.
- **Pseudo-Code**:
  ```typescript
  // in HeliosOptions
  width?: number; // default 1920
  height?: number; // default 1080

  // in HeliosState
  width: number;
  height: number;

  // in Helios class
  private _width: Signal<number>;
  private _height: Signal<number>;

  public get width(): ReadonlySignal<number> { return this._width; }
  public get height(): ReadonlySignal<number> { return this._height; }

  constructor(options: HeliosOptions) {
     // Validate width/height > 0
     // Initialize signals with defaults (1920, 1080)
  }

  public setSize(width: number, height: number) {
     // Validate > 0
     // Update signals
  }
  ```
- **Public API Changes**:
  - `HeliosState`: Added `width`, `height`.
  - `HeliosOptions`: Added `width`, `height`.
  - `Helios`: Added `width`, `height` getters and `setSize` method.
  - `HeliosErrorCode`: Added `INVALID_RESOLUTION`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/core`.
- **Success Criteria**:
  - New tests pass:
    - Initialize with default resolution (1920x1080).
    - Initialize with custom resolution.
    - Throw `INVALID_RESOLUTION` for non-positive dimensions.
    - `setSize` updates state and notifies subscribers.
  - Existing tests pass.
- **Edge Cases**:
  - Negative or zero width/height.
