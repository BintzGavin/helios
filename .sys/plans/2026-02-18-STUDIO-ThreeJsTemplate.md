# Context & Goal
- **Objective**: Add a "Three.js" template to the Studio composition creator.
- **Trigger**: Vision Gap - "Three.js" support is a key "Canvas MVP" feature but currently lacks a scaffold in the Studio.
- **Impact**: Enables quick creation of high-performance 3D compositions, aligning with the core architectural vision for Canvas/WebGL performance.

# File Inventory
- **Create**: `packages/studio/src/server/templates/three.ts` (New template implementation)
- **Modify**: `packages/studio/src/server/templates/index.ts` (Export the new template)
- **Modify**: `packages/studio/src/components/CreateCompositionModal.tsx` (Add "Three.js" option to UI)
- **Read-Only**: `packages/studio/src/server/templates/types.ts` (For type definitions)

# Implementation Spec
- **Architecture**:
  - The template will generate a `composition.html` file that sets up a standard Three.js scene (Scene, Camera, Renderer, Light, Mesh).
  - It will import `three` (assuming user installation) and `@helios-project/core`.
  - It will wire up `helios.subscribe()` to drive the Three.js render loop and animation (e.g., rotating a cube).
- **Pseudo-Code**:
  - `threeTemplate`:
    - `id`: 'three'
    - `label`: 'Three.js'
    - `generate(name, options)`:
      - Return `[{ path: 'composition.html', content: ... }]`.
      - Content includes:
        - HTML boilerplate.
        - `<script type="module">`
          - `import * as THREE from 'three';`
          - `import { Helios } from '@helios-project/core';`
          - Setup Scene, Camera, Renderer.
          - Add generic 3D object (Cube).
          - `new Helios(...)` setup.
          - `helios.subscribe(...)` to update object rotation and call `renderer.render()`.
- **Public API Changes**:
  - No changes to public API (internal template addition).
- **Dependencies**:
  - User must have `three` installed (`npm install three`). The template will include a comment advising this.

# Test Plan
- **Verification**:
  - Run `npm run dev` in `packages/studio` (or `npx helios studio` if linked).
  - Click "Create Composition".
  - Select "Three.js" from the template dropdown.
  - Enter name "Test Three" and click "Create".
  - Verify `examples/test-three/composition.html` exists and contains the Three.js boilerplate.
- **Success Criteria**:
  - The new composition is discoverable and loads in the Studio.
  - The code in `composition.html` is valid syntax.
- **Edge Cases**:
  - User missing `three` dependency: The composition will fail to load in preview, but the file creation should still succeed.
