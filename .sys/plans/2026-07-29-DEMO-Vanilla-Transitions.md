# 2026-07-29-DEMO-Vanilla-Transitions

#### 1. Context & Goal
- **Objective**: Create a Vanilla JS/TypeScript example demonstrating how to coordinate CSS Transitions/Animations using Helios, bridging the gap with other framework examples (`react-transitions`, `vue-transitions`).
- **Trigger**: Parity gap. While React/Vue/Svelte have "transitions" examples using CSS animations, Vanilla does not.
- **Impact**: Demonstrates the "Use What You Know" vision for Vanilla JS users, showing that standard CSS animations work out-of-the-box with Helios's `autoSyncAnimations`.

#### 2. File Inventory
- **Create**:
  - `examples/vanilla-transitions/composition.html`: Entry point.
  - `examples/vanilla-transitions/src/main.ts`: Logic for initializing Helios and managing scene visibility.
  - `examples/vanilla-transitions/src/style.css`: CSS Animations definition.
  - `examples/vanilla-transitions/tsconfig.json`: TypeScript config (copied from `vanilla-typescript`).
- **Modify**: None.
- **Read-Only**: `packages/core/src/sequencing.ts` (for API verification).

#### 3. Implementation Spec
- **Architecture**:
  - **CSS Animations**: Define `@keyframes` (fade out, slide in, zoom in) in `style.css`.
  - **Helios**: Initialize with `autoSyncAnimations: true`. This automatically synchronizes the CSS animations to the video time.
  - **Sequencing**: Use the `sequence()` helper from `@helios-project/core` inside `helios.subscribe()` to toggle `display` or classes on elements, effectively mounting/unmounting them based on the timeline.
- **Pseudo-Code (src/main.ts)**:
  ```typescript
  import { Helios, sequence } from '@helios-project/core';

  const helios = new Helios({ durationInSeconds: 7, autoSyncAnimations: true });
  helios.bindToDocumentTimeline();

  // Elements
  const scene1 = document.querySelector('.scene-1');
  const scene2 = document.querySelector('.scene-2');
  // ...

  helios.subscribe(({ currentFrame }) => {
    // Visibility Management
    // Scene 1: 0 - 90
    const s1 = sequence({ frame: currentFrame, from: 0, durationInFrames: 90 });
    scene1.style.display = s1.isActive ? 'flex' : 'none';

    // Scene 2: 60 - 150
    const s2 = sequence({ frame: currentFrame, from: 60, durationInFrames: 90 });
    scene2.style.display = s2.isActive ? 'flex' : 'none';

    // CSS Animations handle the opacity/transform/interpolation automatically
    // via autoSyncAnimations: true
  });
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. `npm run build:examples`: Verifies TypeScript compilation and build output.
  2. `npx tsx tests/e2e/verify-render.ts vanilla-transitions`: Verifies the specific example renders a valid video (non-black, correct duration).
- **Success Criteria**: Build succeeds, and E2E verification confirms a valid video file is generated.
