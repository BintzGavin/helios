#### 1. Context & Goal
- **Objective**: Implement a standard Transitions library (`transition`, `crossfade`) in `packages/core` to handle scene transition logic, and correct the package installation name in `README.md`.
- **Trigger**: The `README.md` explicitly lists "Transitions library" as a missing feature ("🔴 Not yet"), and incorrectly instructs users to install `@helios-engine/core` instead of the actual `@helios-project/core`.
- **Impact**: Unlocks standardized, easy-to-use transition logic for developers (closing a gap vs Remotion) and fixes a critical "First Run" experience issue where installation instructions fail.

#### 2. File Inventory
- **Create**:
  - `packages/core/src/transitions.ts`: New module containing pure logic for transitions.
  - `packages/core/src/transitions.test.ts`: Unit tests for the new module.
- **Modify**:
  - `packages/core/src/index.ts`: Export the new module.
  - `README.md`: Update package name in "Quick Start" and update "Transitions library" status in comparison table.
- **Read-Only**:
  - `packages/core/src/animation.ts`: (Reference for existing interpolation logic).

#### 3. Implementation Spec
- **Architecture**: Pure functional helpers that return numerical progress (0-1) or state objects. No side effects.
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/transitions.ts

  export interface TransitionOptions {
    easing?: (t: number) => number;
  }

  export interface CrossfadeResult {
    in: number;  // 0 -> 1
    out: number; // 1 -> 0
  }

  /**
   * Calculates the progress of a transition.
   * Returns 0 before start, 0->1 during duration, 1 after.
   */
  export function transition(frame: number, start: number, duration: number, options?: TransitionOptions): number {
    // 1. Calculate local progress (frame - start) / duration
    // 2. Clamp 0-1
    // 3. Apply easing if provided
    // 4. Return result
  }

  /**
   * Calculates values for a crossfade transition.
   * Useful for overlapping scenes.
   */
  export function crossfade(frame: number, start: number, duration: number, options?: TransitionOptions): CrossfadeResult {
    // 1. Get progress from transition()
    // 2. Return { in: progress, out: 1 - progress }
  }
  ```
- **Public API Changes**:
  - New exports from `@helios-project/core`: `transition`, `crossfade`, `TransitionOptions`, `CrossfadeResult`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `transitions.test.ts` passes all cases (before, during, after, exact boundary, zero duration).
  - `transition` returns `0` before start, `1` after end.
  - `crossfade` returns correctly inverted values.
  - `README.md` contains `@helios-project/core`.
- **Edge Cases**:
  - Duration = 0 (Should snap to 1 immediately).
  - Negative frames (Should handle gracefully/clamp).
