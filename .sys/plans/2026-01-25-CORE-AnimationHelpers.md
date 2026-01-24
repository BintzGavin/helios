# 2026-01-25-CORE-AnimationHelpers.md

#### 1. Context & Goal
- **Objective**: Implement the `interpolate` helper function in `packages/core`.
- **Trigger**: Vision Gap - README promises "Animation Helpers" like `interpolate` which are currently missing.
- **Impact**: Enables developers to easily map frame numbers to animation values (opacity, transform, etc.) without external libraries, improving the developer experience and parity with Remotion.

#### 2. File Inventory
- **Create**:
  - `packages/core/src/animation.ts`: Will contain the `interpolate` logic and types.
  - `packages/core/src/animation.test.ts`: Unit tests for interpolation.
- **Modify**:
  - `packages/core/src/index.ts`: Export the new animation helpers.
- **Read-Only**:
  - `packages/core/package.json`

#### 3. Implementation Spec
- **Architecture**: Pure functional implementation. Stateless.
- **Public API Changes**:
  - Export `interpolate(value: number, inputRange: number[], outputRange: number[], options?: InterpolateOptions): number`
  - Export `type InterpolateOptions = { extrapolateLeft?: ExtrapolateType, extrapolateRight?: ExtrapolateType, easing?: (t: number) => number }`
  - Export `type ExtrapolateType = 'extend' | 'clamp' | 'identity'`
- **Pseudo-Code**:
  ```typescript
  function interpolate(input, inputRange, outputRange, options) {
    // 1. Validation (ranges length match, input ascending)
    // 2. Handle Extrapolation (Left/Right)
    //    If input < inputMin: handle based on extrapolateLeft
    //    If input > inputMax: handle based on extrapolateRight
    // 3. Find Range Segment
    //    Find i such that inputRange[i] <= input <= inputRange[i+1]
    // 4. Calculate ratio (0-1) within segment
    // 5. Apply Easing if provided
    // 6. Map to outputRange[i] -> outputRange[i+1]
    // 7. Return result
  }
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `interpolate(0.5, [0, 1], [0, 100])` returns `50`.
  - `interpolate(1.5, [0, 1], [0, 100], { extrapolateRight: 'clamp' })` returns `100`.
  - Multi-segment interpolation works: `[0, 10, 20] -> [0, 100, 0]`.
- **Edge Cases**:
  - Input outside range (extrapolation).
  - Single point range (should throw or handle gracefully).
  - Mismatched range lengths (throw).
  - Input range not sorted (throw).
