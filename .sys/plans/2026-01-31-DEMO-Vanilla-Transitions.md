# Plan: Vanilla Transitions Example

#### 1. Context & Goal
- **Objective**: Create `examples/vanilla-transitions` to demonstrate the `transition` and `crossfade` helpers from `@helios-project/core`.
- **Trigger**: The Core API exports `transition` and `crossfade` helpers, but existing examples (`*-transitions`) rely on framework-specific or CSS transitions. There is no clear reference for using the engine's native transition logic.
- **Impact**: Unlocks "Core Concepts" documentation for manual sequencing and transitioning, essential for Canvas/WebGL users or Vanilla JS implementations where CSS transitions aren't applicable.

#### 2. File Inventory
- **Create**:
  - `examples/vanilla-transitions/composition.html`: Entry point.
  - `examples/vanilla-transitions/src/main.ts`: Logic using `transition` and `crossfade`.
  - `examples/vanilla-transitions/vite.config.js`: Build config.
- **Modify**:
  - `examples/README.md`: Add `vanilla-transitions` to the "Vanilla JS" and "Core Concepts" sections.
- **Read-Only**: `packages/core/src/transitions.ts` (Reference for API).

#### 3. Implementation Spec
- **Architecture**: Vanilla TypeScript with Vite. Direct DOM manipulation driven by `helios.subscribe()`.
- **Pseudo-Code**:
  ```typescript
  import { Helios, crossfade, transition } from '@helios-project/core';

  const helios = new Helios({ duration: 5, fps: 30 });

  // Scene definitions
  const SCENE_1 = { start: 0, duration: 60 };
  const SCENE_2 = { start: 45, duration: 60 }; // Overlap by 15 frames

  helios.subscribe(({ currentFrame }) => {
     // Scene 1 -> Scene 2 Crossfade
     const { in: s2In, out: s1Out } = crossfade(currentFrame, SCENE_2.start, 15);

     scene1.style.opacity = s1Out.toString();
     scene2.style.opacity = s2In.toString();

     // Scene 3 Slide In
     const slideProgress = transition(currentFrame, 120, 30);
     scene3.style.transform = `translateX(${(1 - slideProgress) * 100}%)`;
  });
  ```
- **Dependencies**: None (uses root `node_modules`).

#### 4. Test Plan
- **Verification**:
  1. `npm run build:examples`
  2. `npx tsx tests/e2e/verify-render.ts "vanilla-transitions"`
- **Success Criteria**:
  - Build succeeds.
  - E2E render produces a video file with valid duration and non-black frames.
