# Spec: Scaffold Svelte Captions Animation Example

## 1. Context & Goal
- **Objective**: Create `examples/svelte-captions-animation` to demonstrate how to use Helios SRT captions with Svelte 5 Runes.
- **Trigger**: Vision gap identified—React and Vue have modern caption examples, but Svelte is missing one.
- **Impact**: Ensures Svelte developers have a modern, idiomatic reference for using captions, fulfilling the "Use What You Know" promise.

## 2. File Inventory
- **Create**:
    - `examples/svelte-captions-animation/vite.config.js`: Vite configuration with Svelte plugin and aliases.
    - `examples/svelte-captions-animation/composition.html`: Entry HTML file.
    - `examples/svelte-captions-animation/src/main.js`: Entry JS file to mount the App using Svelte 5 `mount`.
    - `examples/svelte-captions-animation/src/App.svelte`: Main component demonstrating captions.
    - `examples/svelte-captions-animation/src/lib/helios.svelte.js`: Svelte 5 reactive state class wrapping `activeCaptions`.
    - `examples/svelte-captions-animation/src/lib/CaptionOverlay.svelte`: Component to display captions.
- **Modify**: None.
- **Read-Only**: `examples/svelte-runes-animation/src/lib/helios.svelte.ts` (for reference).

## 3. Implementation Spec
- **Architecture**:
    - Use Svelte 5 Runes API (`$state`, `$derived`).
    - `helios.svelte.js`: Export `class HeliosState` with `activeCaptions = $state([])`.
    - `App.svelte`: Initialize `Helios`, bind to timeline, and pass instance to `CaptionOverlay`.
    - `CaptionOverlay.svelte`: Instantiate `HeliosState(helios)` and render `state.activeCaptions`.
- **Pseudo-Code**:
    - `helios.svelte.js`:
      ```javascript
      export class HeliosState {
        activeCaptions = $state([]);
        constructor(helios) {
          helios.subscribe(state => this.activeCaptions = state.activeCaptions);
        }
      }
      ```
    - `CaptionOverlay.svelte`:
      ```svelte
      <script>
        import { HeliosState } from './helios.svelte.js';
        let { helios } = $props();
        const state = new HeliosState(helios);
      </script>
      {#each state.activeCaptions as caption}
        <p>{caption.text}</p>
      {/each}
      ```
- **Dependencies**: `@helios-project/core` (internal), `svelte` (root).

## 4. Test Plan
- **Verification**:
    - Run `npm run build:examples` to ensure it builds.
    - Run `npx tsx tests/e2e/verify-render.ts "Svelte Captions"` to verify the output video duration and content.
- **Success Criteria**:
    - Build succeeds.
    - E2E test passes (video generated, non-black frames, correct duration).
- **Edge Cases**:
    - Handle empty captions array.
