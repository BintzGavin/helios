# 2025-02-18-DEMO-Scaffold-Svelte-Example

## 1. Context & Goal
- **Objective**: Scaffold the missing Svelte example to demonstrate the "Use What You Know" promise for Svelte developers.
- **Trigger**: Missing Svelte example in `examples/` and status `docs/status/DEMO.md` listing it as missing.
- **Impact**: Unlocks Svelte support demonstration and completes the framework coverage (React, Vue, Svelte, Vanilla).

## 2. File Inventory
- **Modify**:
  - `package.json`: Add `svelte` and `@sveltejs/vite-plugin-svelte` to devDependencies. Add `dev:svelte` script.
  - `vite.build-example.config.js`: Import `svelte` plugin, add it to plugins array, and add `svelte_composition` to rollup inputs.
- **Create**:
  - `examples/svelte-canvas-animation/vite.config.js`: Config with svelte plugin and package aliases.
  - `examples/svelte-canvas-animation/index.html`: Dev entry point.
  - `examples/svelte-canvas-animation/composition.html`: Renderer entry point.
  - `examples/svelte-canvas-animation/src/main.js`: App mount point.
  - `examples/svelte-canvas-animation/src/App.svelte`: Main component with canvas animation logic.
  - `examples/svelte-canvas-animation/src/lib/helios-store.js`: The Svelte Store adapter.
- **Read-Only**:
  - `examples/react-canvas-animation/**` (For reference)

## 3. Implementation Spec
- **Architecture**:
  - Use Svelte 5 (latest stable) via `npm install svelte`.
  - Use `vite` for bundling.
  - **Adapter Pattern**: Create a `createHeliosStore` function that returns a Svelte `readable` store. This store subscribes to `helios` and updates the value on every frame change.
- **Pseudo-Code**:
  - `helios-store.js`:
    ```javascript
    import { readable } from 'svelte/store';
    export function createHeliosStore(helios) {
      return readable(helios.getState().currentFrame, (set) => {
        const update = (state) => set(state.currentFrame);
        return helios.subscribe(update); // subscribe returns unsubscribe
      });
    }
    ```
  - `App.svelte`:
    ```svelte
    <script>
      import { onMount } from 'svelte';
      import { Helios } from '../../../packages/core/dist/index.js';
      import { createHeliosStore } from './lib/helios-store.js';

      const helios = new Helios({ duration: 5, fps: 30 });
      helios.bindToDocumentTimeline();

      const frame = createHeliosStore(helios);
      let canvas;

      // Use reactive statement to draw on frame change
      $: {
         if (canvas) {
           const ctx = canvas.getContext('2d');
           // Draw logic using $frame
         }
      }
    </script>
    <canvas bind:this={canvas} />
    ```
- **Dependencies**: None from other agents.

## 4. Test Plan
- **Verification**:
  1. `npm install` (to install svelte deps).
  2. `npm run dev:svelte` -> Check http://localhost:5173 (or assigned port) for rotating orange animation.
  3. `npm run build:examples` -> Check `output/example-build/assets/` contains svelte chunk.
- **Success Criteria**:
  - `dev:svelte` starts without error.
  - Animation plays in browser.
  - Build command succeeds and produces artifacts.
