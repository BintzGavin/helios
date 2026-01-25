# 2026-02-19-DEMO-SvelteHelpers.md

#### 1. Context & Goal
- **Objective**: Scaffold `examples/svelte-animation-helpers` to demonstrate the `<Sequence>` pattern and context-based timing in Svelte.
- **Trigger**: Vision gap - The README promises Animation Helpers (sequences) but only Vanilla and React examples exist. Svelte users need a reference for composing timelines.
- **Impact**: Unlocks advanced composition capabilities for Svelte users, matching React's feature set.

#### 2. File Inventory
- **Create**:
  - `examples/svelte-animation-helpers/composition.html`: Entry point (matches existing convention).
  - `examples/svelte-animation-helpers/vite.config.js`: Build config (matches `svelte-dom-animation`).
  - `examples/svelte-animation-helpers/src/main.js`: Mounts the app (matches `svelte-dom-animation`).
  - `examples/svelte-animation-helpers/src/App.svelte`: Main component usage.
  - `examples/svelte-animation-helpers/src/lib/Sequence.svelte`: The Sequence component.
  - `examples/svelte-animation-helpers/src/lib/store.js`: Helios store adapter (copy from `svelte-dom-animation`).
  - `examples/svelte-animation-helpers/src/lib/context.js`: Context keys.
- **Modify**:
  - `vite.build-example.config.js`: Add `svelte_helpers` to input list.
- **Read-Only**:
  - `examples/react-animation-helpers/`: For reference logic.
  - `examples/svelte-dom-animation/`: For Svelte boilerplate.

#### 3. Implementation Spec
- **Architecture**:
  - Uses Svelte `derived` stores for reactive frame propagation.
  - Uses `setContext` and `getContext` to pass frame stores down the component tree.
  - Wraps `@helios-engine/core`'s `sequence()` utility to calculate relative time.

- **`src/lib/store.js`**:
  - Mirrors `examples/svelte-dom-animation/src/lib/store.js`.
  - Exports `createHeliosStore(helios)` which returns a `readable` store.

- **`src/lib/context.js`**:
  - Exports `export const FRAME_CONTEXT_KEY = Symbol('helios-frame');`

- **`src/lib/Sequence.svelte`**:
  ```javascript
  // Imports: getContext, setContext, derived, FRAME_CONTEXT_KEY, sequence

  // Props: from, durationInFrames

  // Logic:
  const parentFrameStore = getContext(FRAME_CONTEXT_KEY);

  const sequenceState = derived(parentFrameStore, ($parentFrame) =>
    sequence({ frame: $parentFrame, from, durationInFrames })
  );

  const isActive = derived(sequenceState, $s => $s.isActive);
  const relativeFrame = derived(sequenceState, $s => $s.relativeFrame);

  setContext(FRAME_CONTEXT_KEY, relativeFrame);

  // Template:
  // {#if $isActive} <slot /> {/if}
  ```

- **`src/App.svelte`**:
  - Imports `Helios`, `createHeliosStore`, `FRAME_CONTEXT_KEY`, `Sequence`, `setContext`, `derived`.
  - Initializes `Helios` (duration: 5, fps: 30) and binds to document.
  - Creates `heliosStore`.
  - Creates `currentFrame` derived store: `derived(heliosStore, $s => $s.currentFrame)`.
  - Sets root context: `setContext(FRAME_CONTEXT_KEY, currentFrame)`.
  - Template:
    - Renders a title.
    - Uses `<Sequence from={0} durationInFrames={30}>` with a visual element.
    - Uses a second `<Sequence from={30} durationInFrames={30}>` with another element.
    - (Optional) Nested sequence to prove composition.

- **`src/main.js`**:
  - Uses `import { mount } from 'svelte'` to mount `App`.

- **`vite.config.js`**:
  - Configures `@sveltejs/vite-plugin-svelte` and `fs.allow` root, same as `svelte-dom-animation`.

- **`vite.build-example.config.js`**:
  - Adds `svelte_helpers: resolve(__dirname, "examples/svelte-animation-helpers/composition.html")` to inputs.

#### 4. Test Plan
- **Verification**:
  1. `npm run build:examples`
  2. `ls -l output/example-build/assets/svelte_helpers-*.js` (Confirm build artifact exists)
- **Success Criteria**: Build succeeds without errors and artifacts are generated.
- **Pre-Commit**: Complete pre-commit steps (including `npm run build:examples`) to ensure proper testing, verification, review, and reflection are done.
