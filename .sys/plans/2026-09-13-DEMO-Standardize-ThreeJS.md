# Plan: Standardize Three.js Canvas Example

## 1. Context & Goal
- **Objective**: Modernize the legacy `threejs-canvas-animation` example by converting it from inline JavaScript to a standard TypeScript + Vite project structure with a proper `package.json`.
- **Trigger**: The current example uses legacy inline scripts, lacks `package.json`, and doesn't demonstrate the "Professional" Vite+TS pipeline promised in the Vision. It also relies on implicit root hoisting.
- **Impact**: Improves the "Use What You Know" story for Three.js users, providing a copy-pasteable, self-contained example that follows modern best practices.

## 2. File Inventory
- **Create**:
    - `examples/threejs-canvas-animation/package.json`: To declare dependencies (`three`, `vite`, `typescript`).
    - `examples/threejs-canvas-animation/tsconfig.json`: To enable strict TypeScript checking.
    - `examples/threejs-canvas-animation/src/main.ts`: The new entry point containing the Three.js logic (ported from HTML).
- **Modify**:
    - `examples/threejs-canvas-animation/composition.html`: Update `<script>` to point to `src/main.ts`.
    - `examples/threejs-canvas-animation/vite.config.js`: Update to use proper aliases and plugins if needed (to support local dev).

## 3. Implementation Spec
- **Architecture**:
    - Move logic from `composition.html` <script> tag to `src/main.ts`.
    - Replace `../../packages/core/src/index.ts` import with `@helios-project/core`.
    - Add explicit types for Three.js objects (e.g., `THREE.WebGLRenderer`, `THREE.Mesh`).
    - Ensure `vite.config.js` maps `@helios-project/core` correctly for local development.
- **Dependencies**:
    - `three` (already in root)
    - `@types/three` (already in root)
    - `vite` (already in root)

## 4. Test Plan
- **Verification**:
    - Run `npm run build:examples` to ensure the root build system picks up the changes and bundles correctly.
    - (Optional) Run `npx vite build examples/threejs-canvas-animation` to verify isolated build.
- **Success Criteria**:
    - `output/example-build/examples/threejs-canvas-animation/composition.html` exists.
    - The build process completes without errors.
