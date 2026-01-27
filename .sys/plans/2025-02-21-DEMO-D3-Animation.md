# Plan: Scaffold D3 Data Visualization Example

## 1. Context & Goal
- **Objective**: Create a "Realistic Example" using **D3.js** to demonstrate data-driven video generation (e.g., a Bar Chart Race).
- **Trigger**: "Use What You Know" promise implies support for standard libraries like D3, but no example exists.
- **Impact**: Unlocks the "Data Visualization" use case for Helios, proving it can be used for more than just motion graphics.

## 2. File Inventory
- **Create**:
    - `examples/d3-animation/composition.html`: The entry point for the composition.
    - `examples/d3-animation/src/index.js`: The Vanilla JS logic using D3 and Helios.
    - `examples/d3-animation/src/data.js`: Mock data for the chart.
- **Modify**:
    - `package.json`: Add `d3` as a dev dependency and `dev:d3` script.
    - `vite.build-example.config.js`: Add `d3_animation` to the build input.
    - `tests/e2e/verify-render.ts`: Add verification test case for `D3 Animation`.
- **Read-Only**:
    - `packages/core/src/index.ts`: To ensure correct import usage.

## 3. Implementation Spec
- **Architecture**:
    - **Framework**: Vanilla JS (to show raw D3 integration).
    - **Logic**:
        - Initialize `Helios` instance.
        - Use `d3` to append SVG elements to the DOM.
        - **Crucial**: Do NOT use `d3.transition()` as it relies on internal timers that drift.
        - Instead, use `helios.subscribe(({ currentFrame }) => { ... })`.
        - Inside the subscription, calculate interpolated values based on `currentFrame` and use `d3.selection().attr()` to update the DOM immediately.
    - **Visual**: A simple "Bar Chart" where bar heights animate based on data over time.
- **Public API Changes**: None.
- **Dependencies**:
    - `d3` (latest) - Add to `package.json` devDependencies.

## 4. Test Plan
- **Verification**:
    1.  `npm install` (to install d3).
    2.  `npm run build:examples`.
    3.  `npx ts-node tests/e2e/verify-render.ts`.
- **Success Criteria**:
    - `output/example-build/examples/d3-animation/composition.html` exists.
    - `output/d3-animation-render-verified.mp4` is generated.
    - The verification script exits with success.
- **Edge Cases**:
    - Ensure D3 imports work in Vite build (ESM).
