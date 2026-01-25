# Spec: Scaffold Svelte DOM Example

## 1. Context & Goal
- **Objective**: Create a Svelte example project (`examples/svelte-dom-animation`) that demonstrates how to use Helios with Svelte stores to drive DOM animations (CSS bindings).
- **Trigger**: The README promises "Use What You Know" and Svelte support (via `$store`). While a Canvas example exists, a DOM example is missing to show the primary use case of reactive style bindings.
- **Impact**: Unlocks the ability for Svelte developers to use Helios for DOM-based motion graphics using standard Svelte syntax.

## 2. File Inventory
- **Create**:
  - `examples/svelte-dom-animation/package.json`: Project dependencies (`svelte`, `vite`, `@sveltejs/vite-plugin-svelte`).
  - `examples/svelte-dom-animation/vite.config.js`: Vite configuration with Svelte plugin.
  - `examples/svelte-dom-animation/composition.html`: HTML entry point mounting the Svelte app.
  - `examples/svelte-dom-animation/src/main.js`: Application mount point.
  - `examples/svelte-dom-animation/src/App.svelte`: Main component with reactive bindings (e.g., `style:opacity={$store.currentFrame}`).
  - `examples/svelte-dom-animation/src/lib/store.js`: Svelte store adapter (copied from `svelte-canvas-animation`).
- **Modify**:
  - `vite.build-example.config.js`: Add `svelte_dom` to the `input` map in `rollupOptions` to include it in the root build.
  - `tests/e2e/verify-render.ts`: Add `{ name: 'Svelte DOM', relativePath: 'examples/svelte-dom-animation/composition.html', mode: 'dom' }` to the `CASES` array.
- **Read-Only**:
  - `examples/svelte-canvas-animation/src/lib/store.js`: Reference for the store implementation.

## 3. Implementation Spec
- **Architecture**:
  - **Bundling**: Vite with `@sveltejs/vite-plugin-svelte`.
  - **State Management**: `svelte/store` `readable` store wrapping `helios.subscribe`.
  - **Rendering**: DOM elements with `style:prop={value}` bindings driven by the `$store`.
- **Pseudo-Code (App.svelte)**:
  ```svelte
  <script>
    import { Helios } from '@helios-engine/core';
    import { createHeliosStore } from './lib/store';

    // Init Helios
    const helios = new Helios({ duration: 5, fps: 30 });
    helios.bindToDocumentTimeline(); // For dev mode preview

    // Create store
    const frame = createHeliosStore(helios);

    // Expose for player
    window.helios = helios;
  </script>

  <div style:opacity={$frame.currentFrame / 150} style:transform="...">
    Svelte DOM
  </div>
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples`.
  2. Verify `output/example-build/examples/svelte-dom-animation/composition.html` exists.
  3. Run `npx ts-node tests/e2e/verify-render.ts`.
- **Success Criteria**:
  - Build succeeds.
  - Verification script attempts to render the new example.
  - **Note**: The verification might fail with a timeout if the `CdpTimeDriver` + `DomStrategy` issue persists (see `docs/status/DEMO.md`). This is expected behavior for now; the goal is to add the test case even if it fails due to the known engine issue.
- **Edge Cases**:
  - Ensure `vite.config.js` correctly resolves `packages/core` (via relative path or alias).
