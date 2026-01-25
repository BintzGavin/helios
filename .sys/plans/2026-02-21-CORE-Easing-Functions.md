# 2026-02-21-CORE-Easing-Functions

#### 1. Context & Goal
- **Objective**: Implement a standard library of easing functions in `packages/core` to support `interpolate` and other animation helpers.
- **Trigger**: The current "Animation Helpers" feature (`interpolate`) forces users to implement their own math for non-linear animations, which is a significant DX gap compared to standard CSS or libraries like Remotion/GSAP.
- **Impact**: Unlocks standard "batteries-included" animation capabilities. Users can simply use `Easing.quad.out` instead of writing `t => t * (2 - t)`.

#### 2. File Inventory
- **Create**: `packages/core/src/easing.ts` (Implementation of the Easing object and helper functions)
- **Create**: `packages/core/src/easing.test.ts` (Unit tests for easing logic)
- **Modify**: `packages/core/src/index.ts` (Export `Easing` and `EasingFunction` types)
- **Read-Only**: `packages/core/src/animation.ts` (To ensure compatibility with `interpolate`)

#### 3. Implementation Spec
- **Architecture**:
  - Module Pattern: Export a namespace-like object `Easing`.
  - Pure Functions: All easings are `(t: number) => number`.
  - Categorization: Group polynomial/trig easings into sub-objects (`in`, `out`, `inOut`).
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/easing.ts

  export type EasingFunction = (t: number) => number;

  export const Easing = {
    linear: (t) => t,
    step: (steps) => (t) => Math.floor(t * steps) / steps,

    // Polynomials (quad, cubic, quart, quint)
    quad: { in, out, inOut },
    cubic: { in, out, inOut },
    ...

    // Transcendental (sine, expo, circ)
    sine: { ... },
    ...

    // Physical (elastic, back, bounce)
    elastic: { ... },
    back: { ... }, // default overshoot = 1.70158
    bounce: { ... },

    // Custom
    bezier: (x1, y1, x2, y2) => {
      // Implement Newton-Raphson or binary subdivision to solve cubic bezier for t
      return (t) => solvedY;
    }
  }
  ```
- **Public API Changes**:
  - New export `Easing` from `@helios-engine/core`.
  - New export `type EasingFunction`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `easing.test.ts` passes.
  - Linear returns identity.
  - Ease-in functions start slow, end fast.
  - Ease-out functions start fast, end slow.
  - `bezier(0.25, 0.1, 0.25, 1.0)` matches CSS `ease` approximation.
- **Edge Cases**:
  - `t < 0` or `t > 1`: Easing functions generally assume clamped input, but should behave predictably (e.g. following the curve) if unchecked, though `interpolate` usually handles clamping.
  - `bezier` with invalid points (x < 0 or x > 1).
