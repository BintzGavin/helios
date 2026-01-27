# Plan: Scaffold WAAPI Animation Example

## 1. Context & Goal
- **Objective**: Create a pure Vanilla JS example demonstrating integration with the standard Web Animations API (`element.animate()`) without external libraries.
- **Trigger**: The README heavily promotes "Use What You Know" and WAAPI support, but no example exists that uses the raw API (only CSS or libraries like Motion One).
- **Impact**: Validates the "Native Always Wins" thesis and provides a copy-pasteable reference for developers preferring imperative native animation.

## 2. File Inventory
- **Create**:
  - `examples/waapi-animation/composition.html`: The composition logic using `element.animate()` and `autoSyncAnimations: true`.
  - `examples/waapi-animation/index.html`: The player wrapper for previewing.
  - `examples/waapi-animation/README.md`: Explanation of the example.
- **Modify**:
  - `vite.build-example.config.js`: Add the new example to the build configuration.
    - Add `waapi_animation: resolve(__dirname, "examples/waapi-animation/composition.html")` to `input`.
  - `tests/e2e/verify-render.ts`: Add a verification case for the new example.
    - Add `{ name: 'WAAPI Animation', relativePath: 'examples/waapi-animation/composition.html', mode: 'dom' }`.
- **Read-Only**:
  - `packages/core/dist/index.js` (Imported by composition)

## 3. Implementation Spec
- **Architecture**:
  - **Composition**: Vanilla JS. Creates DOM elements and triggers `element.animate()` with standard KeyframeEffects.
  - **Helios Integration**: initialized with `autoSyncAnimations: true` which automatically finds, pauses, and seeks these animations via the `DomDriver`.
- **Pseudo-Code (Composition)**:
  ```javascript
  import { Helios } from '../../packages/core/dist/index.js';

  // 1. Create elements
  const box = document.querySelector('.box');

  // 2. Create WAAPI animation
  // IMPORTANT: We do not need to store the reference. Helios finds it via autoSyncAnimations.
  // We set duration to match or exceed composition, and loop it.
  box.animate(
    [
      { transform: 'translate(0, 0) rotate(0deg)', backgroundColor: '#ff0055' },
      { transform: 'translate(200px, 0) rotate(180deg)', backgroundColor: '#00eeff' },
      { transform: 'translate(0, 0) rotate(360deg)', backgroundColor: '#ff0055' }
    ],
    {
      duration: 4000,
      iterations: Infinity,
      easing: 'ease-in-out'
    }
  );

  // 3. Initialize Helios
  const helios = new Helios({
    fps: 30,
    duration: 4,
    autoSyncAnimations: true
  });

  // 4. Bind to document timeline for Renderer control
  helios.bindToDocumentTimeline();

  // Expose for debugging
  window.helios = helios;
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples` to ensure it compiles.
  2. Run `npx ts-node tests/e2e/verify-render.ts` to verify it renders correctly in the headless environment.
- **Success Criteria**:
  - Build succeeds.
  - `verify-render.ts` reports "✅ WAAPI Animation Passed!".
  - Output video shows the element moving/rotating.
