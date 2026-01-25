# 📋 Plan: Create Three.js Example

## 1. Context & Goal
- **Objective**: Add a Three.js canvas animation example to the `examples/` directory.
- **Trigger**: The README promises "Canvas-to-Video ... WebCodecs path for Three.js", but no such example exists.
- **Impact**: Demonstrates Helios capability to drive high-performance 3D scenes, fulfilling a key product promise and enabling E2E verification of the WebGL/Three.js integration path.

## 2. File Inventory

### Create
- `examples/threejs-canvas-animation/composition.html`: The main composition file using Three.js.
- `examples/threejs-canvas-animation/index.html`: The preview wrapper using `<helios-player>`.
- `examples/threejs-canvas-animation/vite.config.js`: The dev server configuration for this example.

### Modify
- `package.json`: Add `three` to `devDependencies`.
- `vite.build-example.config.js`: Add `threejs_composition` to the `input` block.
- `tests/e2e/verify-render.ts`: Add a test case for `ThreeJS`.

## 3. Implementation Spec

### Architecture
- **Dependency**: Use `three` (v0.160.0 or later) from `node_modules`.
- **Integration**:
  - `composition.html` imports `Helios` from `../../packages/core/dist/index.js` and `three` from `three`.
  - Initialize `THREE.WebGLRenderer`, `Scene`, `Camera`.
  - Create a simple 3D object (e.g., a rotating Cube with lighting).
  - Initialize `Helios`.
  - `helios.subscribe(({ currentFrame, fps }) => ...)` updates the cube's rotation based on frame time and calls `renderer.render(scene, camera)`.
  - **Crucial**: Ensure the canvas is sized to the window (`resize` listener) and Helios is bound to document timeline (`helios.bindToDocumentTimeline()`).

### Pseudo-Code (composition.html)
```javascript
import * as THREE from 'three';
import { Helios } from '../../packages/core/dist/index.js';

// Setup Three.js
const canvas = document.getElementById('composition-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1).normalize();
scene.add(light);

// Object
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Setup Helios
const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

// Drive Animation
function draw(frame) {
  const time = frame / 30; // fps hardcoded or from state
  cube.rotation.x = time;
  cube.rotation.y = time;
  renderer.render(scene, camera);
}

helios.subscribe((state) => {
  draw(state.currentFrame);
});

// Resize Logic
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  draw(helios.currentFrame); // redraw
});
// Init size
renderer.setSize(window.innerWidth, window.innerHeight);
```

### Dependencies
- None from other agents.

## 4. Test Plan
- **Verification**:
  1.  `npm install three --save-dev` (Executor must do this).
  2.  `npm run build:examples` (verifies `vite.build-example.config.js` and `composition.html` build).
  3.  `npx ts-node tests/e2e/verify-render.ts` (verifies the composition renders to video successfully).
- **Success Criteria**:
  - `output/threejs-render-verified.mp4` is generated.
  - The script outputs `✅ ThreeJS Passed!`.
- **Edge Cases**:
  - Ensure `three` imports correctly from the built `dist` context in `verify-render` vs dev mode.
