# 2025-02-23-DEMO-Svelte-Transitions

## 1. Context & Goal
- **Objective**: Create a new example `examples/svelte-transitions` that demonstrates how to sequence standard CSS animations in Svelte using `autoSyncAnimations: true` and the `animation-delay` pattern.
- **Trigger**: The "Use What You Know" promise implies support for standard CSS animations in all frameworks. While React has a transitions example, Svelte (a framework known for its transitions) does not have a dedicated example showing how to sync them with the Helios timeline.
- **Impact**: Unlocks the ability for Svelte users to build complex, multi-scene sequences using standard CSS keyframes, proving that Helios works with Svelte's ecosystem patterns.

## 2. File Inventory
- **Create**:
    - `examples/svelte-transitions/vite.config.js`: Configuration for Vite with Svelte plugin.
    - `examples/svelte-transitions/composition.html`: Entry point for the example.
    - `examples/svelte-transitions/src/main.js`: Svelte app mount point.
    - `examples/svelte-transitions/src/lib/store.js`: Svelte store for Helios state (standard boilerplate).
    - `examples/svelte-transitions/src/lib/Sequence.svelte`: Component to handle timeline sequencing and CSS variable injection.
    - `examples/svelte-transitions/src/App.svelte`: The main composition demonstrating multiple sequences.
- **Modify**:
    - `vite.build-example.config.js`: Add `svelte_transitions` to the build inputs.
    - `tests/e2e/verify-render.ts`: Add `Svelte Transitions` to the verification cases.
- **Read-Only**:
    - `examples/svelte-dom-animation/src/lib/store.js` (For reference implementation of store)
    - `examples/react-transitions/src/components/Sequence.jsx` (For reference implementation of logic)

## 3. Implementation Spec
- **Architecture**:
    - **Helios Config**: `autoSyncAnimations: true` is enabled. This forces the browser's internal animation timeline to sync with `document.timeline`, which Helios controls.
    - **Sequencing**: A `<Sequence>` component conditionally renders its slot based on `currentFrame`.
    - **Time Synchronization**: To ensure CSS animations start at the correct visual time relative to the Sequence's start frame, the `<Sequence>` component calculates `startTime = from / fps` and injects it as a CSS variable `--sequence-start`.
    - **CSS Pattern**: Child elements use `animation-delay: var(--sequence-start)` to offset their start time. This ensures that even if the element is mounted late (during a seek), the animation calculation aligns perfectly with the global timeline.
- **Pseudo-Code (src/lib/Sequence.svelte)**:
    ```svelte
    <script>
      export let from = 0;
      export let duration = Infinity;
      export let fps = 30;

      // Import store
      import { heliosStore } from './store';

      $: currentFrame = $heliosStore.currentFrame;
      $: visible = currentFrame >= from && currentFrame < from + duration;
      $: startTime = from / fps;
    </script>

    {#if visible}
      <div class="sequence-wrapper" style="--sequence-start: {startTime}s">
        <slot />
      </div>
    {/if}

    <style>
      .sequence-wrapper {
        display: contents; /* Avoid layout shifts */
      }
    </style>
    ```
- **Dependencies**:
    - `svelte` (v4/v5 - use existing version in root package.json)
    - `@helios-engine/core`

## 4. Test Plan
- **Verification**:
    1. Run `npm run build:examples`.
    2. Run `npx ts-node tests/e2e/verify-render.ts`.
- **Success Criteria**:
    - Build completes without error.
    - `tests/e2e/verify-render.ts` outputs `✅ Svelte Transitions Passed!`.
    - Video output (`output/svelte-transitions-render-verified.mp4`) shows distinct scenes appearing at correct times with smooth animations.
- **Edge Cases**:
    - **Seeking**: The critical test is that seeking to the middle of an animation works. `verify-render.ts` uses `SeekTimeDriver` (via DOM mode default logic) which tests seeking implicitly during rendering.
