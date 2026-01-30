# STUDIO: Implement Three.js Composition Template

## 1. Context & Goal
- **Objective**: Implement a "Three.js" template for the Composition Creator to support the "Canvas-to-Video" priority path.
- **Trigger**: The Vision emphasizes "Canvas-to-Video" (Three.js/Pixi.js) as the MVP priority path, but the Studio currently lacks a starter template for it, forcing users to manually scaffold it from the Vanilla template.
- **Impact**: Reduces friction for developers creating high-performance canvas animations, enabling them to start with a working "native-aligned" example immediately.

## 2. File Inventory
- **Create**: `packages/studio/src/server/templates/threejs.ts`
  - Purpose: Define the `threejsTemplate` object with the `generate` function.
- **Modify**: `packages/studio/src/server/templates/index.ts`
  - Purpose: Export the new template so it can be consumed by the discovery logic.
- **Modify**: `packages/studio/src/components/CreateCompositionModal.tsx`
  - Purpose: Add "Three.js" to the template selection dropdown in the UI.
- **Read-Only**: `packages/studio/src/server/templates/types.ts` (for interface reference)

## 3. Implementation Spec

### Architecture
The "Three.js" template will follow the same pattern as the existing `vanilla` template. It will generate a single `composition.html` file that:
1.  Imports `Helios` from `@helios-project/core`.
2.  Imports `three` (assuming it is available in `node_modules`).
3.  Sets up a basic Three.js scene (Scene, Camera, WebGLRenderer, Mesh).
4.  Binds Helios to the document timeline.
5.  Uses `helios.subscribe()` to drive the animation frame-by-frame.

### Pseudo-Code

**1. `packages/studio/src/server/templates/threejs.ts`:**
```typescript
import { Template } from './types';

export const threejsTemplate: Template = {
  id: 'threejs',
  label: 'Three.js',
  generate: (name, options) => {
    const { fps, duration } = options;
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>body { margin: 0; overflow: hidden; } canvas { display: block; }</style>
      </head>
      <body>
        <canvas id="canvas"></canvas>
        <script type="module">
          import * as THREE from 'three';
          import { Helios } from '@helios-project/core';

          // Standard Three.js Setup
          const canvas = document.getElementById('canvas');
          const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
          camera.position.z = 5;

          // Add a Cube
          const geometry = new THREE.BoxGeometry();
          const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
          const cube = new THREE.Mesh(geometry, material);
          scene.add(cube);

          // Resize Logic
          window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
          });
          renderer.setSize(window.innerWidth, window.innerHeight);

          // Helios Setup
          const helios = new Helios({ duration: ${duration}, fps: ${fps} });
          helios.bindToDocumentTimeline();

          // Animation Loop
          helios.subscribe((state) => {
             const time = state.time;
             cube.rotation.x = time;
             cube.rotation.y = time;
             renderer.render(scene, camera);
          });
        </script>
      </body>
      </html>
    `;
    return [{ path: 'composition.html', content }];
  }
};
```

**2. `packages/studio/src/server/templates/index.ts`:**
- Import `threejsTemplate`.
- Add it to the `templates` export object.

**3. `packages/studio/src/components/CreateCompositionModal.tsx`:**
- Add `<option value="threejs">Three.js</option>` to the `<select>` element.

### Dependencies
- No new package dependencies (the repo already has `three` in devDependencies).
- The generated code assumes the user has `three` installed. Since Studio is often used in this monorepo or projects where `npm install` has run, this is acceptable. The template could optionally include a comment reminding the user to install it.

## 4. Test Plan

### Verification
1.  **Launch Studio**: `npx helios studio`
2.  **Open Creator**: Click the "+" button in the header.
3.  **Select Template**: Choose "Three.js" from the dropdown.
4.  **Create**: Enter a name (e.g., "MyThreeScene") and click "Create".
5.  **Observe**:
    - The stage should load the new composition.
    - A green wireframe cube should be visible.
    - Clicking "Play" (Space) should rotate the cube.
    - Dragging the timeline scrubber should update the cube's rotation smoothly.
    - Resizing the browser window should resize the canvas correctly.

### Success Criteria
- A `composition.html` file is generated in the new folder.
- The browser successfully resolves `import * as THREE from 'three'`.
- The animation is synchronized with Helios time (`state.time`).

### Edge Cases
- **Missing Dependency**: If `three` is not installed in the user's project, the preview will show a Vite error overlay. This is expected behavior for a template; the user must ensure dependencies exist.
