# 2026-08-02-DEMO-Vanilla-Transitions

#### 1. Context & Goal
- **Objective**: Create `examples/vanilla-transitions` to demonstrate sequenced scene transitions using Vanilla JS and the `sequence()` utility.
- **Trigger**: Vision gap - "Transitions" are a core pattern demonstrated in React/Vue/Svelte/Solid but missing in Vanilla JS.
- **Impact**: Provides a reference for developers using Vanilla JS to manage complex timelines and scene changes without a framework, reinforcing the "Use What You Know" vision.

#### 2. File Inventory
- **Create**:
    - `examples/vanilla-transitions/composition.html`: Entry point HTML.
    - `examples/vanilla-transitions/tsconfig.json`: TypeScript configuration (extending root).
    - `examples/vanilla-transitions/src/main.ts`: Application logic using `helios.subscribe` and `sequence()`.
    - `examples/vanilla-transitions/src/style.css`: CSS for scene layout and transition classes.
- **Modify**: None.
- **Read-Only**: `packages/core/src/sequencing.ts` (Reference for `sequence` API).

#### 3. Implementation Spec
- **Architecture**:
    - **Helios Setup**: Initialize `Helios` with `autoSyncAnimations: true` to drive CSS animations via `document.timeline`.
    - **Logic**: Use `sequence()` from `@helios-project/core` inside `helios.subscribe()` to calculate `isActive` for each scene.
    - **DOM**: Toggle `display: flex/none` based on `isActive`.
    - **Animation**: Use standard CSS `@keyframes` and `animation` properties in `style.css`.
- **Pseudo-Code (src/main.ts)**:
    ```typescript
    import { Helios, sequence } from '@helios-project/core';
    import './style.css';

    const helios = new Helios({
        fps: 30,
        duration: 7, // 210 frames
        autoSyncAnimations: true
    });

    // Fallback for document timeline binding
    helios.bindToDocumentTimeline();

    // Elements
    const scene1 = document.getElementById('scene-1')!;
    const scene2 = document.getElementById('scene-2')!;
    const scene3 = document.getElementById('scene-3')!;

    helios.subscribe((state) => {
        // Scene 1: 0 - 90 (3s)
        const s1 = sequence({ frame: state.currentFrame, from: 0, durationInFrames: 90 });
        scene1.style.display = s1.isActive ? 'flex' : 'none';

        // Scene 2: 60 - 150 (3s) - Overlaps 1s
        const s2 = sequence({ frame: state.currentFrame, from: 60, durationInFrames: 90 });
        scene2.style.display = s2.isActive ? 'flex' : 'none';

        // Scene 3: 120 - 210 (3s) - Overlaps 1s
        const s3 = sequence({ frame: state.currentFrame, from: 120, durationInFrames: 90 });
        scene3.style.display = s3.isActive ? 'flex' : 'none';
    });

    // Expose for debugging
    (window as any).helios = helios;
    ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
    1. Run `npm run build:examples` to ensure the new example compiles correctly.
    2. Run `npx tsx tests/e2e/verify-render.ts vanilla-transitions` to verify the rendered video has correct duration and non-black content.
- **Success Criteria**:
    - Build succeeds with artifact in `output/example-build/examples/vanilla-transitions/`.
    - E2E verification passes with `✅ Vanilla Transitions Passed!`.
- **Edge Cases**:
    - Verify overlap periods (e.g., frame 75) show both Scene 1 and Scene 2 (if CSS permits overlay, otherwise stacking order applies).
