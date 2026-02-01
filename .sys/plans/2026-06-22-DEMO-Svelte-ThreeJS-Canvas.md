# 2026-06-22-DEMO-Svelte-ThreeJS-Canvas.md

#### 1. Context & Goal
- **Objective**: Create a Svelte example demonstrating 3D rendering with Three.js driven by Helios.
- **Trigger**: Vision gap. React and Vue have explicit Three.js examples; Svelte (a primary supported framework) does not.
- **Impact**: Provides a copy-pasteable reference for Svelte developers to build high-performance 3D video compositions, completing the "Big 3" framework parity.

#### 2. File Inventory
- **Create**:
    - `examples/svelte-threejs-canvas-animation/package.json`
    - `examples/svelte-threejs-canvas-animation/vite.config.js`
    - `examples/svelte-threejs-canvas-animation/index.html`
    - `examples/svelte-threejs-canvas-animation/src/main.ts`
    - `examples/svelte-threejs-canvas-animation/src/App.svelte`
    - `examples/svelte-threejs-canvas-animation/src/lib/store.ts` (Helios store adapter)
- **Modify**: None.
- **Read-Only**: `examples/vue-threejs-canvas-animation/src/App.vue` (Reference pattern)

#### 3. Implementation Spec
- **Architecture**:
    - **Vite**: Standard Svelte + TS setup.
    - **Helios**: Instantiated in `App.svelte` and bound to Document Timeline.
    - **State Management**: Svelte `readable` store created via `createHeliosStore` factory.
    - **Rendering Strategy**: **Deterministic**.
        - Initialize Three.js `WebGLRenderer` targeting a `<canvas>`.
        - Do **NOT** use `requestAnimationFrame`.
        - Use a reactive statement (`$: $heliosStore.currentFrame`) to trigger `updateScene()` and `renderer.render()`.
        - This ensures the renderer stays perfectly in sync with Helios's virtual time during export.
- **Pseudo-Code (`App.svelte`)**:
  ```svelte
  <script>
    import { onMount, onDestroy } from 'svelte';
    import * as THREE from 'three';
    import { Helios } from '@helios-project/core';
    import { createHeliosStore } from './lib/store';

    let canvas;
    let renderer, scene, camera, cube;

    // Init Helios
    const helios = new Helios({ duration: 10, fps: 30 });
    helios.bindToDocumentTimeline();

    // Create Store
    const heliosStore = createHeliosStore(helios);

    // Reactive render loop
    $: if (renderer && $heliosStore) {
       update($heliosStore.currentFrame);
       renderer.render(scene, camera);
    }

    function update(frame) {
        // Update Three.js objects based on frame
    }

    onMount(() => {
       // Init Three.js
       renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
       // ... setup scene ...
       // Initial render
       renderer.render(scene, camera);
    });

    onDestroy(() => {
       renderer.dispose();
    });
  </script>
  <canvas bind:this={canvas} />
  ```
- **Dependencies**:
  - `three`
  - `@types/three`
  - `svelte`
  - `@helios-project/core` (workspace)

#### 4. Test Plan
- **Verification**:
    1.  `npm install` (to install new workspace deps).
    2.  `npm run build:examples` (to ensure it compiles).
    3.  `npx tsx tests/e2e/verify-render.ts "Svelte Threejs"` (to verify it renders non-black frames).
- **Success Criteria**:
    - The verification script reports "PASS".
    - The output video contains a rotating cube (or similar 3D object).
- **Edge Cases**:
    - Resize handling (ensure `renderer.setSize` is called).
    - Cleanup (dispose renderer on unmount).
