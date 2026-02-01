# Spec: Scaffold Svelte Captions Animation Example

## 1. Context & Goal
- **Objective**: Create `examples/svelte-captions-animation` to demonstrate how to use Helios captions with Svelte.
- **Trigger**: Vision gap identified—React and Vue have caption examples, but Svelte is missing one, violating framework parity.
- **Impact**: Ensures Svelte developers have a reference for using captions, fulfilling the "Use What You Know" promise.

## 2. File Inventory
- **Create**:
    - `examples/svelte-captions-animation/vite.config.js`: Vite configuration with Svelte plugin.
    - `examples/svelte-captions-animation/composition.html`: Entry HTML file.
    - `examples/svelte-captions-animation/src/main.js`: Entry JS file to mount the App.
    - `examples/svelte-captions-animation/src/App.svelte`: Main component demonstrating captions.
    - `examples/svelte-captions-animation/src/lib/store.js`: Helper to create a Helios store.
- **Modify**: None.
- **Read-Only**: `examples/svelte-animation-helpers/vite.config.js` (for reference).

## 3. Implementation Spec
- **Architecture**:
    - Use Svelte 5 (compatible with Svelte 3/4 syntax via `svelte/store`) as the framework.
    - Use `readable` store to wrap `helios.subscribe`.
    - Derive `activeCaptions` from the main store.
    - Inline SRT data in `composition.html` or `main.js` to keep it self-contained.
    - Use `helios.bindToDocumentTimeline()` to ensure E2E test stability.
- **Pseudo-Code**:
    - `store.js`: Export `createHeliosStore(helios)` which returns a readable store of the state.
    - `App.svelte`:
        - Initialize `Helios` with `captions`.
        - Create store: `const state = createHeliosStore(helios)`.
        - Derive captions: `$: captions = $state.activeCaptions`.
        - Render: `{#each captions as caption} <div class="caption">{caption.text}</div> {/each}`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    - Run `npm run build:examples` to ensure it builds.
    - Run `npx tsx tests/e2e/verify-render.ts "Svelte Captions"` to verify the output video duration and content.
- **Success Criteria**:
    - Build succeeds.
    - E2E test passes (video generated, non-black frames, correct duration).
- **Edge Cases**:
    - Ensure `activeCaptions` handles empty arrays gracefully.
