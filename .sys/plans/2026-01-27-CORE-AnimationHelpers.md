# 2026-01-27-CORE-AnimationHelpers

#### 1. Context & Goal
- **Objective**: Implement standard animation utility functions (`clamp`, `remap`, `loop`, `pingPong`) in `packages/core`.
- **Trigger**: Vision gap "Animation Helpers" - users need these standard primitives which are currently missing.
- **Impact**: Enables easier creation of generative and cyclic animations without users reinventing basic math.

#### 2. File Inventory
- **Create**: None.
- **Modify**:
  - `packages/core/src/animation.ts`: Add new exported functions.
- **Read-Only**:
  - `packages/core/src/index.ts`: Verfied to export `* from './animation'`, so no change needed.

#### 3. Implementation Spec
- **Architecture**: Functional helpers. Pure functions with no side effects.
- **Pseudo-Code**:
  ```typescript
  export function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
  }

  export function remap(val: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    // Basic linear interpolation
    if (inMin === inMax) return outMin; // Avoid division by zero
    return outMin + (val - inMin) * (outMax - outMin) / (inMax - inMin);
  }

  export function loop(frame: number, duration: number): number {
    // Return frame % duration
    if (duration === 0) return 0;
    return frame % duration;
  }

  export function pingPong(frame: number, duration: number): number {
    // Triangle wave
    if (duration === 0) return 0;
    const period = 2 * duration;
    const t = frame % period;

    if (t < duration) {
        return t;
    } else {
        return period - t;
    }
  }
  ```
- **Public API Changes**:
  - `export function clamp(...)`
  - `export function remap(...)`
  - `export function loop(...)`
  - `export function pingPong(...)`
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**: New tests in `packages/core/src/animation.test.ts` pass, verifying correct behavior for all helpers including edge cases (negative inputs, zero duration).
- **Edge Cases**:
  - `loop` with duration 0.
  - `pingPong` with duration 0.
  - `remap` with `inMin === inMax` (div by zero).
