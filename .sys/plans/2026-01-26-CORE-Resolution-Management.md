# 2026-01-26-CORE-Resolution-Management.md

#### 1. Context & Goal
- **Objective**: Implement resolution management (`width` and `height`) in the `Helios` core engine.
- **Trigger**: The "Headless Logic Engine" vision requires the core to be aware of composition dimensions for Canvas rendering and responsive layouts, which is currently missing.
- **Impact**: Enables parametric compositions that adapt to resolution changes (e.g., social media vs. cinema), supports proper Canvas resizing, and aligns with `helios-player` capabilities.

#### 2. File Inventory
- **Modify**: `packages/core/src/errors.ts` (Add `INVALID_RESOLUTION` error code)
- **Modify**: `packages/core/src/index.ts` (Update `HeliosState`, `HeliosOptions`, `Helios` class with resolution signals and `setSize` method)
- **Modify**: `packages/core/src/index.test.ts` (Add unit tests for resolution initialization, validation, and updates)

#### 3. Implementation Spec
- **Architecture**:
  - Extend `HeliosState` to include `width: number` and `height: number`.
  - Extend `HeliosOptions` to accept optional `width` and `height` (defaulting to 1920x1080).
  - Use `Signal<number>` for internal storage to allow reactive updates.
  - Implement `setSize(width: number, height: number)` to update dimensions atomically.
- **Public API Changes**:
  - `HeliosState`: Added `width`, `height`.
  - `HeliosOptions`: Added `width?`, `height?`.
  - `Helios` class: Added `width` (ReadonlySignal<number>), `height` (ReadonlySignal<number>), `setSize(width: number, height: number)`.
  - `HeliosErrorCode`: Added `INVALID_RESOLUTION`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/core`.
- **Success Criteria**:
  - Tests pass for default resolution (1920x1080).
  - Tests pass for custom resolution initialization.
  - Tests pass for `setSize` updates triggering subscribers.
  - Tests pass for validation errors (negative/zero dimensions).
- **Edge Cases**: Zero width/height, negative values, non-integer values (should be allowed? standard is integer, but maybe not strict). Validation should ensure > 0.
