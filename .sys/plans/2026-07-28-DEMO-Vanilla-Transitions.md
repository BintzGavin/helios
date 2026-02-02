# 2026-07-28-DEMO-Vanilla-Transitions

#### 1. Context & Goal
- **Objective**: Create a Vanilla JS/TypeScript example demonstrating manual scene sequencing and transitions using the `@helios-project/core` helpers.
- **Trigger**: Parity gap. React, Vue, Svelte, and Solid have `*-transitions` examples, but Vanilla does not, despite the library exporting `sequence` and `transition` primitives explicitly for this purpose.
- **Impact**: Provides a canonical reference for using Helios in a "framework-less" environment for complex sequencing, fulfilling the "Use What You Know" (Vanilla JS) promise.

#### 2. File Inventory
- **Create**:
  - `examples/vanilla-transitions/composition.html`: Entry point.
  - `examples/vanilla-transitions/src/main.ts`: Logic for sequencing scenes.
  - `examples/vanilla-transitions/src/styles.css`: Styling for overlapping scenes.
  - `examples/vanilla-transitions/tsconfig.json`: Editor configuration.
- **Modify**: None.
- **Read-Only**: `packages/core/src/index.ts` (for API verification).

#### 3. Implementation Spec
- **Architecture**:
  - Standard Vite + TypeScript setup (no framework).
  - 3 Scenes (DOM nodes) created dynamically or statically in HTML.
  - `Helios` instance drives the loop.
  - Inside `subscribe()`:
    - Use `sequence({ frame, from, duration })` to determine active state for each scene.
    - Use `transition(frame, start, duration)` to calculate opacity/transform values.
    - Manually update DOM `style` properties.
- **Pseudo-Code**:
  ```typescript
  import { Helios, sequence, transition } from '@helios-project/core';

  const helios = new Helios({ durationInSeconds: 7 });

  helios.subscribe(({ currentFrame }) => {
    // Scene 1: Frame 0-90
    const s1 = sequence({ frame: currentFrame, from: 0, durationInFrames: 90 });
    scene1.style.opacity = s1.isActive ? 1 - transition(currentFrame, 60, 30) : 0; // Fade out last 1s

    // Scene 2: Frame 60-150 (starts at 2s)
    const s2 = sequence({ frame: currentFrame, from: 60, durationInFrames: 90 });
    scene2.style.opacity = transition(currentFrame, 60, 30); // Fade in first 1s

    // ... Scene 3
  });
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. `npm run build:examples` -> Should pass and generate `output/example-build/examples/vanilla-transitions/composition.html`.
  2. `npx tsx tests/e2e/verify-render.ts` -> Should auto-discover and pass for `vanilla-transitions`.
- **Success Criteria**: The example renders without error, and the output video (verified by `verify-render.ts`) has the correct duration and non-black frames.
- **Edge Cases**: Ensure `sequence` handles frames outside the active range correctly (returning `isActive: false`), so inactive scenes are hidden.
