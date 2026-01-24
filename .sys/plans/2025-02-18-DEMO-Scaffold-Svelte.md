# [2025-02-18] DEMO - Scaffold Svelte Example

## 1. Context & Goal
- **Objective**: Scaffold a complete Svelte example composition (`examples/svelte-canvas-animation`) to fulfill the framework support promise in the README.
- **Trigger**: The "Use What You Know" section of the README lists Svelte support, but no example exists in the codebase.
- **Impact**: Unlocks Svelte support for users, providing a reference implementation for reactive video composition using Svelte stores.

## 2. File Inventory
- **Modify**:
    - `package.json`: Add `svelte` and `@sveltejs/vite-plugin-svelte` to `devDependencies`. Add `"dev:svelte": "vite serve examples/svelte-canvas-animation"` to `scripts`.
    - `vite.build-example.config.js`: Import `svelte` plugin, add it to `plugins` array, and add `svelte_composition` entry to `rollupOptions.input` pointing to `examples/svelte-canvas-animation/composition.html`.
- **Create**:
    - `examples/svelte-canvas-animation/vite.config.js`: Vite config with `svelte()` plugin, `server.fs.allow`, and path aliases for `/packages`.
    - `examples/svelte-canvas-animation/index.html`: Host page containing `<helios-player>`.
    - `examples/svelte-canvas-animation/composition.html`: Guest page mounting the Svelte app.
    - `examples/svelte-canvas-animation/src/main.js`: Entry point to mount `App.svelte`.
    - `examples/svelte-canvas-animation/src/App.svelte`: Main component implementing the canvas animation.
    - `examples/svelte-canvas-animation/src/lib/store.js`: Implementation of `createHeliosStore`.

## 3. Implementation Spec
- **Architecture**:
    - Use `vite` with `@sveltejs/vite-plugin-svelte` for building.
    - Implement `createHeliosStore(helios)` in `store.js` using Svelte's `readable` store to wrap `helios.subscribe()`.
    - `App.svelte` should instantiate `Helios` (singleton), create the store, and use the `$` auto-subscription syntax to trigger canvas updates.
- **Pseudo-Code**:
    - `store.js`:
      ```js
      import { readable } from 'svelte/store';
      export const createHeliosStore = (helios) => readable(helios.getState().currentFrame, set => {
        return helios.subscribe(state => set(state.currentFrame));
      });
      ```
    - `App.svelte`:
      ```svelte
      <script>
        import { onMount } from 'svelte';
        import { Helios } from '../../../packages/core/dist/index.js';
        import { createHeliosStore } from './lib/store';

        // Config
        const duration = 5;
        const fps = 30;
        const helios = new Helios({ duration, fps });
        helios.bindToDocumentTimeline();
        if (typeof window !== 'undefined') window.helios = helios;

        const frame = createHeliosStore(helios);
        let canvas;

        $: if (canvas) draw($frame);

        function draw(f) {
           // Canvas drawing logic (clear, draw shapes based on f)
        }

        // Resize logic in onMount
      </script>
      <canvas bind:this={canvas} style="width: 100%; height: 100%; display: block;" />
      ```
- **Dependencies**: `svelte`, `@sveltejs/vite-plugin-svelte`.

## 4. Test Plan
- **Verification**:
    1. Run `npm install` to install new deps.
    2. Run `npm run dev:svelte` and verify the server starts and the animation plays in the browser.
    3. Run `npm run build:examples` and verify `output/example-build` contains the build artifacts.
- **Success Criteria**:
    - `npm run dev:svelte` successfully serves the example.
    - `npm run build:examples` completes without error.
