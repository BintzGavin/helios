# 2025-02-18-DEMO-Scaffold-Svelte-Example

## 1. Context & Goal
- **Objective**: Create a Svelte example (`examples/svelte-canvas-animation`) to demonstrate Helios integration with Svelte stores.
- **Trigger**: The README promises Svelte support ("Use What You Know"), but no example exists.
- **Impact**: Unlocks Helios for Svelte developers and fulfills the framework-agnostic promise.

## 2. File Inventory
- **Create**:
  - `examples/svelte-canvas-animation/index.html`: Host page with `<helios-player>`.
  - `examples/svelte-canvas-animation/composition.html`: Composition iframe entry point.
  - `examples/svelte-canvas-animation/vite.config.js`: Vite dev server configuration.
  - `examples/svelte-canvas-animation/src/main.js`: App entry point.
  - `examples/svelte-canvas-animation/src/App.svelte`: Main Svelte component demonstrating animation.
  - `examples/svelte-canvas-animation/src/stores/helios.js`: Svelte store wrapper for Helios state.
- **Modify**:
  - `package.json`: Add `svelte` and `@sveltejs/vite-plugin-svelte` to `devDependencies`; add `"dev:svelte"` script.
  - `vite.build-example.config.js`: Add `svelte()` plugin and `svelte_composition` entry point.
- **Read-Only**:
  - `packages/core/dist/index.js`: Import target (via alias).

## 3. Implementation Spec
- **Architecture**:
  - **Store Pattern**: Create a Svelte `readable` store that subscribes to `helios.subscribe`.
  - **Component**: `App.svelte` imports the store and uses auto-subscription (`$store`) to drive a reactive variable (e.g., CSS variable or canvas draw).
  - **Composition**: Follows the pattern of `react-canvas-animation` (iframe-based composition).
- **Pseudo-Code**:
  - **`package.json`**:
    - Add `svelte` (latest) and `@sveltejs/vite-plugin-svelte` (latest) to `devDependencies`.
    - Add `"dev:svelte": "vite serve examples/svelte-canvas-animation"`.
  - **`vite.build-example.config.js`**:
    - Import `svelte` from `@sveltejs/vite-plugin-svelte`.
    - Add `svelte()` to plugins.
    - Add `svelte_composition: resolve(__dirname, "examples/svelte-canvas-animation/composition.html")` to `input`.
  - **`examples/svelte-canvas-animation/vite.config.js`**:
    - Configure with `plugins: [svelte()]`.
    - Set alias for `/packages` to root packages.
  - **`examples/svelte-canvas-animation/src/stores/helios.js`**:
    - `import { readable } from 'svelte/store';`
    - Export function `createHeliosStore(heliosInstance)`:
      - Return `readable(heliosInstance.getState(), (set) => { return heliosInstance.subscribe(set); });`
  - **`examples/svelte-canvas-animation/src/App.svelte`**:
    - Script:
      - Import `Helios` from `/packages/core`.
      - Import `createHeliosStore`.
      - Instantiate `helios`.
      - `const store = createHeliosStore(helios);`
      - Expose `window.helios = helios`.
      - `helios.bindToDocumentTimeline()`.
    - Template:
      - Use `$store.currentFrame` to drive style or canvas.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm install && npm run dev:svelte` then open localhost. Also `npm run build:examples`.
- **Success Criteria**:
  - `dev:svelte` starts the server.
  - Browser shows animation moving.
  - `build:examples` completes and output contains `svelte_composition`.
- **Edge Cases**: Ensure `bindToDocumentTimeline` works correctly with Svelte reactivity.
