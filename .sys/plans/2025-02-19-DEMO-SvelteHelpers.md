# 2025-02-19-DEMO-SvelteHelpers

#### 1. Context & Goal
- **Objective**: Scaffold `examples/svelte-animation-helpers` to demonstrate idiomatic usage of `sequence` and `series` helpers in Svelte 5.
- **Trigger**: The README promises "Animation Helpers" (`interpolate`, `spring`, `<Sequence>`, `<Series>`) for "Any Framework", but currently only React and Vanilla have dedicated examples. Svelte users lack a reference implementation for "Remotion-style" sequencing.
- **Impact**: Unlocks component-based sequencing workflows for Svelte users, reinforcing the "Use What You Know" value proposition.

#### 2. File Inventory
- **Create**:
    - `examples/svelte-animation-helpers/vite.config.js`: Vite configuration (copy pattern from `svelte-dom-animation`, use port 5177).
    - `examples/svelte-animation-helpers/composition.html`: Entry HTML file.
    - `examples/svelte-animation-helpers/src/main.js`: Entry point mounting the app using Svelte 5 `mount`.
    - `examples/svelte-animation-helpers/src/App.svelte`: Main component demonstrating usage of `<Sequence>` and `series()` helper.
    - `examples/svelte-animation-helpers/src/components/Sequence.svelte`: The sequence component implementation.
    - `examples/svelte-animation-helpers/src/lib/store.js`: Helper to wrap Helios signal in a Svelte readable store (copy from `svelte-dom-animation`).
    - `examples/svelte-animation-helpers/src/lib/context.js`: Context key definitions (optional, can use string "frame" for simplicity).
- **Modify**:
    - `vite.build-example.config.js`: Add `svelte_helpers` to the `rollupOptions.input` object.
    - `tests/e2e/verify-render.ts`: Add a test case for "Svelte Helpers" (mode: 'dom').
- **Read-Only**:
    - `examples/svelte-dom-animation/src/lib/store.js`: Reference for `createHeliosStore`.
    - `packages/core/src/sequencing.ts`: Reference for `sequence` logic.

#### 3. Implementation Spec
- **Architecture**:
    - **Svelte 5**: Use modern `import { mount } from 'svelte'` API.
    - **Reactivity**: Use `createHeliosStore` to bridge Helios signals to Svelte stores.
    - **Context**: Use `setContext` and `getContext` to propagate the `frame` signal (or derived store) down the component tree.
    - **Imports**: Use relative imports for core (e.g., `import { ... } from '../../../packages/core/dist/index.js'`).
- **Pseudo-Code (Sequence.svelte)**:
    ```svelte
    <script>
      import { getContext, setContext } from 'svelte';
      import { derived } from 'svelte/store';
      import { sequence } from '../../../packages/core/dist/index.js';

      export let from = 0;
      export let durationInFrames = 0;

      // Get parent frame store
      const parentFrame = getContext('frame');

      // Derive local sequence state
      const sequenceState = derived(parentFrame, ($frame) => {
        return sequence({ frame: $frame, from, durationInFrames });
      });

      // Derive just the relative frame for children
      const relativeFrame = derived(sequenceState, ($s) => $s.relativeFrame);

      // Set context for children
      setContext('frame', relativeFrame);
    </script>

    {#if $sequenceState.isActive}
      <slot />
    {/if}
    ```
- **Pseudo-Code (App.svelte)**:
    ```svelte
    <script>
      import { setContext } from 'svelte';
      import { Helios, series } from '../../../packages/core/dist/index.js';
      import { createHeliosStore } from './lib/store';
      import Sequence from './components/Sequence.svelte';

      // Init Helios
      const helios = new Helios({ duration: 5, fps: 30 });
      helios.bindToDocumentTimeline();
      if (typeof window !== 'undefined') window.helios = helios;

      // Create store
      const heliosStore = createHeliosStore(helios);
      const currentFrame = derived(heliosStore, $s => $s.currentFrame);

      // Provide root frame
      setContext('frame', currentFrame);

      // Demonstrate series helper
      const mySeries = series([
        { durationInFrames: 30, color: 'red' },
        { durationInFrames: 30, color: 'blue' }
      ]);
    </script>

    {#each mySeries as item}
      <Sequence from={item.from} durationInFrames={item.durationInFrames}>
         <!-- Render content -->
      </Sequence>
    {/each}
    ```
- **Dependencies**: `svelte` (root), `@helios-engine/core` (relative).

#### 4. Test Plan
- **Verification**:
    1. Run `npm run build:examples` to ensure the new example is included in the build and compiles successfully.
    2. Run `npx playwright test tests/e2e/verify-render.ts` to verify the rendering pipeline produces a video output.
- **Success Criteria**:
    - Build artifact `output/example-build/assets/svelte_helpers-*.js` exists.
    - `verify-render.ts` output shows "✅ Svelte Helpers Passed!".
