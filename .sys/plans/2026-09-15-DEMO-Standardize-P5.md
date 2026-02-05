# Plan: Standardize P5 Canvas Example

## 1. Context & Goal
- **Objective**: Standardize `examples/p5-canvas-animation` to match the "Professional" example structure (TypeScript, Vite, package.json).
- **Trigger**: Vision gap - the current example is "legacy" style (inline scripts, relative imports), making it hard for users to copy-paste and use.
- **Impact**: Enables users to easily adopt Helios with P5.js using modern tooling. Ensures the example is self-contained and portable.

## 2. File Inventory
- **Create**:
    - `examples/p5-canvas-animation/package.json`: Dependencies (`p5`, `@types/p5`, `vite`, `typescript`).
    - `examples/p5-canvas-animation/tsconfig.json`: Standard TS config.
    - `examples/p5-canvas-animation/vite.config.ts`: Vite config with aliases for local development.
    - `examples/p5-canvas-animation/src/main.ts`: Main entry point containing the P5 sketch and Helios integration.
- **Modify**:
    - `examples/p5-canvas-animation/composition.html`: Update script tag to point to `/src/main.ts`.

## 3. Implementation Spec
- **Architecture**:
    - **Vite**: Use Vite for bundling.
    - **TypeScript**: Typed P5 sketch using `@types/p5`.
    - **P5 Instance Mode**: Use `new p5((p) => { ... })` to avoid global namespace pollution.
    - **Helios Integration**:
        - Instantiate `Helios` with `autoSyncAnimations: false` (since we drive P5's `redraw` manually).
        - Bind to document timeline: `helios.bindToDocumentTimeline()`.
        - Subscribe to Helios updates: `helios.subscribe(() => sketch.redraw())`.
        - P5 Setup: `p.noLoop()` to disable internal loop.
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    1.  Root Build: `npm run build:examples` (verifies integration with monorepo build).
    2.  Standalone Build (Manual): `cd examples/p5-canvas-animation && npm install && npm run build` (verifies portability).
- **Success Criteria**:
    - `output/example-build/examples/p5-canvas-animation/composition.html` exists and loads without errors.
    - `examples/p5-canvas-animation/dist/composition.html` (from standalone build) exists.
- **Edge Cases**:
    - Ensure P5 types match the installed version.
