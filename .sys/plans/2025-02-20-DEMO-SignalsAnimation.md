# Plan: Scaffold Signals Animation Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/signals-animation` that demonstrates high-performance, fine-grained DOM updates using the `@helios-engine/core` Signals architecture (`signal`, `computed`, `effect`).
- **Trigger**: The README mentions "Signal-Based State" as a key architectural feature for performance ("Architecture Hardening"), but no example currently demonstrates how to use these primitives directly to avoid framework overhead.
- **Impact**: This example will serve as a reference for developers needing to animate thousands of elements or complex state without the performance cost of React/Vue reconciliation, fulfilling the "Performance When It Matters" core principle.

## 2. File Inventory
- **Create**:
  - `examples/signals-animation/composition.html`: The main entry point containing the signal-based animation logic.
  - `examples/signals-animation/vite.config.js`: Vite configuration for the example.
- **Modify**:
  - `vite.build-example.config.js`: Add the new example to the build input configuration.
  - `tests/e2e/verify-render.ts`: Add a test case to verify the new example renders correctly.
- **Read-Only**:
  - `packages/core/src/index.ts`: To confirm signal exports and types.
  - `packages/core/src/signals.ts`: To understand `Signal` implementation details.

## 3. Implementation Spec
- **Architecture**:
  - Uses Vanilla JS and `@helios-engine/core`.
  - Imports `Helios`, `signal`, `computed`, `effect` from `../../packages/core/dist/index.js` (following existing examples).
  - Creates a `Helios` instance.
  - Creates a grid of 100+ DOM elements.
  - Demonstrates creating a `computed` signal derived from `helios.currentFrame` (exposed as a signal on the Helios instance).
  - Uses `effect` to apply updates to DOM nodes efficiently (direct style manipulation).
  - Binds to `document.timeline` for preview.
- **Pseudo-Code**:
  ```javascript
  import { Helios, computed, effect } from '../../packages/core/dist/index.js';

  const helios = new Helios({ duration: 5, fps: 30 });
  const count = 100;

  // Create elements
  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    document.body.appendChild(div);

    // Create computed signal for this element
    // helios.currentFrame is a ReadonlySignal<number>
    const transform = computed(() => {
      const frame = helios.currentFrame.value;
      return `translateY(${Math.sin(frame * 0.1 + i) * 50}px)`;
    });

    // Bind signal to DOM
    effect(() => {
      div.style.transform = transform.value;
    });
  }

  helios.bindToDocumentTimeline();
  window.helios = helios;
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples` to ensure the new example builds.
  2. Run `npx ts-node tests/e2e/verify-render.ts` to verify it renders a video successfully.
- **Success Criteria**:
  - Build succeeds.
  - `tests/e2e/verify-render.ts` output includes `✅ Signals Animation Passed!`.
  - Output video `output/signals-animation-render-verified.mp4` is created.
