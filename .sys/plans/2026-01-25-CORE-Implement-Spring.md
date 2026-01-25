# Plan: Implement Spring Animation Helper

#### 1. Context & Goal
- **Objective**: Implement a physics-based `spring` animation helper function in the core library.
- **Trigger**: The `README.md` explicitly lists `spring({ frame, fps, config })` as a planned V1.x feature. This is a critical feature for "parity" with Remotion and for enabling natural motion in parametric compositions.
- **Impact**: Unlocks the ability for users to create physics-driven animations (e.g., elastic pop-ins) using pure TypeScript, without external dependencies. This is a key part of the "Animation Helpers" vision.

#### 2. File Inventory
- **Modify**: `packages/core/src/animation.ts` (Add `spring` function and types)
- **Modify**: `packages/core/src/animation.test.ts` (Add unit tests for `spring`)
- **Read-Only**: `packages/core/src/index.ts` (Already exports `*` from animation, so no change needed here)

#### 3. Implementation Spec
- **Architecture**:
  - The `spring` function will be a pure, stateless function that solves the differential equation for a Damped Harmonic Oscillator at a specific time `t`.
  - It will support `Underdamped`, `Critically Damped`, and `Overdamped` motion.
- **Public API**:
  ```typescript
  export interface SpringConfig {
    mass?: number;      // default: 1
    stiffness?: number; // default: 100
    damping?: number;   // default: 10
    overshootClamping?: boolean; // default: false
  }

  export interface SpringOptions {
    frame: number;
    fps: number;
    config?: SpringConfig;
    from?: number; // default: 0
    to?: number;   // default: 1
    durationInFrames?: number; // Optional, mostly for compatibility, physics doesn't strictly need it
  }

  /**
   * Calculates the value of a spring physics simulation at a specific frame.
   */
  export function spring(options: SpringOptions): number;
  ```
- **Pseudo-Code**:
  ```typescript
  function spring({ frame, fps, config, from = 0, to = 1 }) {
    const t = frame / fps;
    if (t <= 0) return from;

    const { mass = 1, stiffness = 100, damping = 10 } = config;

    // Calculate damping ratio (zeta) and undamped angular frequency (omega_n)
    // zeta = damping / (2 * sqrt(stiffness * mass))
    // omega_n = sqrt(stiffness / mass)

    // Calculate normalized value (0 -> 1) based on cases:
    // 1. Critically Damped (zeta == 1)
    // 2. Underdamped (zeta < 1)
    // 3. Overdamped (zeta > 1)

    // value = from + (to - from) * normalizedValue

    // Apply overshootClamping if enabled
    // If to > from and value > to, return to.
    // If to < from and value < to, return to.

    return value;
  }
  ```
- **Dependencies**: None. Pure math.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/core`
- **Success Criteria**:
  - `spring` at frame 0 returns `from` (0).
  - `spring` at large frame returns `to` (1).
  - Underdamped config produces values > 1 (overshoot).
  - `overshootClamping: true` prevents values > 1.
  - Custom `from` and `to` values work correctly.
- **Edge Cases**:
  - `fps: 0` (should handle gracefully or throw, currently Helios constructor throws, but function should probably be safe or throw helpful error).
  - `mass: 0` (physics break, should default or throw).
