# Plan: Refactor Simple Animation Example

## 1. Context & Goal
- **Objective**: Modernize `examples/simple-animation` by converting it from a legacy HTML-only example to a standardized TypeScript + Vite project.
- **Trigger**: The `simple-animation` example uses legacy relative imports (`../../packages/core`) and inline scripts, violating the "Professional" example standard. It contains both DOM and Canvas implementations mixed in one folder, but only the DOM one (`composition.html`) is currently recognized by the build system.
- **Impact**: Improves maintainability, ensures portability (users can copy-paste the folder and run it), and aligns with the standardized architecture of other examples.

## 2. File Inventory
- **Create**:
  - `examples/simple-animation/package.json`: Define dependencies and build scripts.
  - `examples/simple-animation/vite.config.ts`: Standalone build configuration with source aliases.
  - `examples/simple-animation/tsconfig.json`: TypeScript configuration.
  - `examples/simple-animation/src/main.ts`: Logic refactored from `composition.html`.
  - `examples/simple-animation/src/style.css`: Styles extracted from `composition.html`.
- **Modify**:
  - `examples/simple-animation/composition.html`: Remove inline script/styles and import `./src/main.ts`.
- **Read-Only**:
  - `examples/simple-animation/canvas-composition.html` (Will remain as is, though currently unused/unbuilt by root pipeline).

## 3. Implementation Spec
- **Architecture**:
  - **Vite** for bundling.
  - **TypeScript** for logic.
  - **CSS** for styling (extracted to separate file).
  - **Alias**: `@helios-project/core` -> `../../packages/core/src/index.ts` in `vite.config.ts` for local dev.
- **Pseudo-Code (src/main.ts)**:
  ```typescript
  import { Helios } from '@helios-project/core';
  import './style.css';

  const helios = new Helios({
    duration: 5,
    fps: 30,
    autoSyncAnimations: true // Critical for CSS animations
  });

  helios.bindToDocumentTimeline();
  (window as any).helios = helios;
  ```
- **Dependencies**:
  - `package.json` depends on `@helios-project/core` (file reference).

## 4. Test Plan
- **Verification**:
  1.  **Standalone Build**: Run `npm install` and `npx vite build` inside `examples/simple-animation`.
  2.  **Root Build**: Run `npm run build:examples` from the root.
  3.  **E2E Verification**: Run `npx vitest run tests/e2e/verify-render.ts` (filtering for `Simple Animation`).
- **Success Criteria**:
  - `output/example-build/examples/simple-animation/composition.html` exists.
  - Verification video is generated and has correct duration (5s) and non-black content.
