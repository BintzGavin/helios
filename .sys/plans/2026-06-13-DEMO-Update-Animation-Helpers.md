# 2026-06-13-DEMO-Update-Animation-Helpers.md

#### 1. Context & Goal
- **Objective**: Update Vue, Svelte, and SolidJS "Animation Helpers" examples to demonstrate `interpolate` and `spring` core utilities, ensuring parity with the React example.
- **Trigger**: Journal entry identifying a gap where these core features were only demonstrated in React.
- **Impact**: Provides complete reference implementations for all supported frameworks, proving that core utilities are framework-agnostic.

#### 2. File Inventory
- **Modify**:
  - `examples/vue-animation-helpers/src/App.vue`: Add `interpolate` and `spring` logic and visualization.
  - `examples/svelte-animation-helpers/src/App.svelte`: Add `interpolate` and `spring` logic and visualization.
  - `examples/solid-animation-helpers/src/App.jsx`: Add `interpolate` and `spring` logic and visualization.
- **Read-Only**:
  - `examples/react-animation-helpers/src/App.jsx` (Reference)
  - `packages/core/src/index.ts` (Reference for imports)
  - `examples/solid-animation-helpers/src/lib/createHeliosSignal.js` (Verified return type)

#### 3. Implementation Spec
- **Architecture**:
  - Use the existing framework adapters (Vue Composition API, Svelte Stores, Solid Signals) to drive the core `interpolate` and `spring` functions.
  - The core functions are pure and accept a number (frame), so they will be driven by the reactive frame state in each framework.
- **Pseudo-Code**:
  - **Vue**:
    ```javascript
    import { interpolate, spring } from '../../../packages/core/src/index.ts';
    // Inside script setup
    // frame is a ref(number)
    const x = computed(() => interpolate(frame.value, [0, 60], [0, 200]));
    const scale = computed(() => spring({ frame: frame.value, fps: 30, from: 0, to: 1, config: { stiffness: 100 } }));
    // Add visual element in template using x and scale
    ```
  - **Svelte**:
    ```javascript
    import { interpolate, spring } from '../../../packages/core/src/index.ts';
    // Inside script
    // $currentFrame is the frame number (derived from store)
    $: x = interpolate($currentFrame, [0, 60], [0, 200]);
    $: scale = spring({ frame: $currentFrame, fps: 30, from: 0, to: 1, config: { stiffness: 100 } });
    // Add visual element in markup
    ```
  - **Solid**:
    ```javascript
    import { interpolate, spring } from '@helios-project/core'; // or relative path if needed
    // Inside component
    // frame is a signal accessor returning HeliosState (verified in createHeliosSignal.js)
    const x = () => interpolate(frame().currentFrame, [0, 60], [0, 200]);
    const scale = () => spring({ frame: frame().currentFrame, fps: 30, from: 0, to: 1, config: { stiffness: 100 } });
    // Add visual element in JSX
    ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build:examples` to ensure type safety and compilation.
  - Run `npx tsx tests/e2e/verify-all.ts` to ensure no regressions in existing verification pipeline.
- **Success Criteria**:
  - Build passes.
  - E2E tests pass.
  - Code contains usage of `interpolate` and `spring`.
- **Edge Cases**:
  - Verify behavior with frame 0 to ensure initial state is correct.
  - Verify behavior when frame exceeds duration (spring should hold final value).
- **Pre-commit**:
  - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
