# Plan: Implement Color Interpolation

## 1. Context & Goal
- **Objective**: Implement color parsing and interpolation utilities (`interpolateColors`) in `packages/core`.
- **Trigger**: The current `interpolate()` function only supports numbers, creating a gap for users who need to animate colors programmatically (e.g., from `inputProps` or data-driven themes). This is a standard feature in comparable libraries (like Remotion).
- **Impact**: Unlocks programmatic color transitions for data-driven videos and parametric compositions, enhancing the "Animation Helpers" capability of the core engine.

## 2. File Inventory
- **Create**:
  - `packages/core/src/color.ts`: Implementation of color parsing and interpolation logic.
  - `packages/core/src/color.test.ts`: Unit tests for color utilities.
- **Modify**:
  - `packages/core/src/index.ts`: Export the new color utilities.
- **Read-Only**:
  - `packages/core/src/animation.ts`: Reference for `interpolate` logic (though we won't modify it directly, `interpolateColors` will mimic its API).

## 3. Implementation Spec
- **Architecture**: Pure functional utilities with zero dependencies.
- **Components**:
  - `parseColor(color: string)`: Parses Hex (#RGB, #RRGGBB, #RRGGBBAA) and CSS-style `rgb()`/`rgba()`/`hsl()`/`hsla()` strings into an RGBA object/tuple.
    - *Note*: Will support standard CSS color formats needed for animation.
  - `mixColors(color1, color2, progress)`: Blends two colors in RGBA space.
  - `interpolateColors(input, inputRange, outputRange, options)`:
    - Finds the active segment based on `input` and `inputRange` (similar to `interpolate`).
    - Calculates local progress `t`.
    - Applies easing if provided.
    - Interpolates between the two corresponding colors in `outputRange`.
    - Returns a CSS color string (e.g., `rgba(255, 0, 0, 1)`).
- **Public API Changes**:
  - Export `interpolateColors` function.
  - Export `Color` type or interface.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/core`.
- **Success Criteria**:
  - `parseColor` correctly parses Hex, RGB, RGBA strings.
  - `interpolateColors` correctly blends colors over a range.
  - Handles extrapolation (clamping) correctly.
  - Verified against edge cases (e.g., invalid color strings, single-element ranges).
