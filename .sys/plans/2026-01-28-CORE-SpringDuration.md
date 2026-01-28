# Context & Goal
- **Objective**: Implement `calculateSpringDuration` in `packages/core/src/animation.ts` to determine the settling time of a spring animation.
- **Trigger**: Users currently have to guess the duration of spring animations when sequencing them (e.g., "start text after box settles"). The `durationInFrames` property in `SpringOptions` is currently ignored.
- **Impact**: Enables precise sequencing of physics-based animations (`sequence`, `series`) and improves developer experience by removing guesswork.

# File Inventory
- **Modify**: `packages/core/src/animation.ts` (Add `calculateSpringDuration` and export `SpringConfig` defaults)
- **Modify**: `packages/core/src/animation.test.ts` (Add unit tests for the new utility)
- **Modify**: `packages/core/src/index.ts` (Ensure new function is exported)
- **Read-Only**: `packages/core/src/errors.ts` (For error types)

# Implementation Spec
- **Architecture**: Functional utility. Uses an iterative or analytical approach to find the frame where the spring settles within a threshold.
- **Pseudo-Code**:
  ```typescript
  export const DEFAULT_SPRING_CONFIG = { mass: 1, stiffness: 100, damping: 10, overshootClamping: false };

  export function calculateSpringDuration(options: Omit<SpringOptions, 'frame'>, threshold = 0.001): number {
     // 1. Extract config with defaults
     // 2. If from == to, return 0.
     // 3. If overshootClamping is true:
     //    - Iterate frames (t += 1/fps) to find first frame where spring clamps (reaches target).
     //    - Use a reasonable max iteration count (e.g. 10-30 seconds equivalent) to avoid infinite loops if it never reaches.
     // 4. If not clamped:
     //    - Calculate damping ratio (zeta) and natural frequency (omega_n).
     //    - If zeta < 1 (underdamped): Use envelope formula t = -ln(threshold/|delta|) / (zeta * omega_n)
     //    - If zeta >= 1 (crit/overdamped):
     //        - Iterative scan (or binary search) to find when |dist| < threshold.
     // 5. Return ceil(t * fps)
  }
  ```
- **Public API Changes**:
  - Export `calculateSpringDuration` function.
  - Export `DEFAULT_SPRING_CONFIG` constant.
- **Dependencies**: None.

# Test Plan
- **Verification**: Run `npm test -w packages/core`.
- **Success Criteria**:
  - `calculateSpringDuration` returns reasonable frame counts for standard configs.
  - Returns shorter duration when `overshootClamping` is true.
  - Matches the visual settling point (approx).
  - Tests cover underdamped, critically damped, and overdamped cases.
