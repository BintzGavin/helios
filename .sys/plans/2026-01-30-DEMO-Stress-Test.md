# Plan: DEMO Stress Test Example

## 1. Context & Goal
- **Objective**: Create a `stress-test-animation` example that renders thousands of animated elements using Signals.
- **Trigger**: The README claims Helios's signal-based architecture allows rendering "scenes with thousands of animated elements at 60 FPS", but the largest existing example (`signals-animation`) only uses 100 elements. This is a validation gap for a core architectural claim.
- **Impact**: Provides a benchmark to verify the performance claims and ensures the engine scales as promised. It also serves as a regression test for signal performance.

## 2. File Inventory
- **Create**: `examples/stress-test-animation/composition.html` (Standalone vanilla example using Helios Signals)
- **Modify**: `vite.build-example.config.js` (Add entry point for the new example)
- **Modify**: `tests/e2e/verify-render.ts` (Add new test case to verification suite)

## 3. Implementation Spec
- **Architecture**:
    - Use Vanilla JS with Helios Signals (`signal`, `computed`, `effect`).
    - Render a grid of 2500+ elements (e.g., 50x50 div grid).
    - Use `count` variable to easily adjust density.
    - Each element will have independent color/transform derived from `currentFrame` + `index`.
    - This demonstrates "fine-grained updates" where only the changed attributes update, not the entire tree.
- **Pseudo-Code**:
    ```javascript
    import { Helios, computed, effect } from core;

    // Config
    const count = 2500; // 50x50
    const container = document.getElementById('root');

    // Generate DOM nodes
    for (let i = 0; i < count; i++) {
       const el = document.createElement('div');
       // ...

       // Create Signals
       const transform = computed(() => { ... });

       // Bind
       effect(() => {
          el.style.transform = transform.value;
       });
    }
    ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    - Run `npm run build:examples` to ensure the new example compiles.
    - Run `npx tsx tests/e2e/verify-render.ts` to ensure it renders to video successfully.
- **Success Criteria**:
    - The build completes without error.
    - The verification script reports `✅ Stress Test Passed!`.
    - The output video in `output/` shows the animated grid.
- **Edge Cases**:
    - Extremely high element counts causing browser crash (will stick to 2500 initially).
