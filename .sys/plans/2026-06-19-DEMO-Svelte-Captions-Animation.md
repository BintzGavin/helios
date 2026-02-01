#### 1. Context & Goal
- **Objective**: Create `examples/svelte-captions-animation` to demonstrate Helios captions (SRT) support in Svelte.
- **Trigger**: Parity gap identified; React and Vue have captions examples, Svelte does not.
- **Impact**: Provides "Use What You Know" support for Svelte developers needing captions.

#### 2. File Inventory
- **Create**:
  - `examples/svelte-captions-animation/composition.html`: Entry point for the composition (points to main.js).
  - `examples/svelte-captions-animation/vite.config.js`: Vite configuration for the example (standard root alias).
  - `examples/svelte-captions-animation/src/main.js`: Svelte app mount point (imports App.svelte).
  - `examples/svelte-captions-animation/src/App.svelte`: Main component initializing Helios with captions.
  - `examples/svelte-captions-animation/src/lib/CaptionOverlay.svelte`: Component to display active captions.
  - `examples/svelte-captions-animation/src/lib/stores.js`: Reusable store logic for Helios captions (standard Svelte store).
- **Modify**: None.
- **Read-Only**: `examples/react-captions-animation` (as reference).

#### 3. Implementation Spec
- **Architecture**:
  - **Framework**: Svelte 4 (using standard stores, compatible with Svelte 5).
  - **Logic**:
    - `App.svelte` instantiates `Helios` with `captions: srtString`.
    - `stores.js` exports a `createCaptionsStore(helios)` function that returns a readable store subscribing to `helios.activeCaptions`.
    - `CaptionOverlay.svelte` consumes this store and iterates over the active cues to render them.
    - Styling matches other captions examples (centered, bottom, semi-transparent background).
- **Pseudo-Code**:
  - *stores.js*: `readable([], set => helios.subscribe(s => set(s.activeCaptions)))`
  - *App.svelte*: `helios = new Helios({ captions }); helios.bindToDocumentTimeline();`
- **Dependencies**:
  - `svelte` (hoisted from root).
  - `@helios-project/core` (aliased).

#### 4. Test Plan
- **Verification**:
  - Run `npm run build:examples` (which invokes `vite.build-example.config.js`).
  - Run `npx tsx tests/e2e/verify-render.ts "Svelte Captions"` to verify the specific example.
- **Success Criteria**:
  - Build succeeds.
  - E2E verification passes (video generated, duration correct, non-black frames).
- **Edge Cases**:
  - Verify that the overlay handles empty caption states gracefully (should render nothing).
