# Plan: Standardize Audio Visualization Example

## 1. Context & Goal
- **Objective**: Standardize the `examples/audio-visualization` example by converting it from a legacy vanilla JS implementation to a modern TypeScript-based Vite project with a dedicated `package.json`.
- **Trigger**: The current `examples/audio-visualization` lacks a `package.json` and uses inline scripts, failing to demonstrate the recommended "Professional" project structure promised in the Vision.
- **Impact**: Ensures the example serves as a correct, copy-pasteable reference for users building audio-reactive content, and enables better type safety and tooling integration.

## 2. File Inventory
- **Create**:
    - `examples/audio-visualization/package.json`: Define dependencies and scripts.
    - `examples/audio-visualization/tsconfig.json`: TypeScript configuration.
    - `examples/audio-visualization/src/main.ts`: TypeScript entry point containing the logic moved from the HTML file.
- **Modify**:
    - `examples/audio-visualization/composition.html`: Update to source the script from `./src/main.ts`.
- **Delete/Rename**:
    - `examples/audio-visualization/vite.config.js`: Rename to `vite.config.ts` and update content to use `defineConfig` and TS support.

## 3. Implementation Spec
- **Architecture**:
    - **Build System**: Vite with TypeScript support.
    - **Dependency Management**: Local `package.json` using the `file:` protocol for the core dependency (e.g., `"@helios-project/core": "file:../../packages/core"`), matching `examples/simple-animation`.
    - **Logic**: Move the existing Canvas and Web Audio API logic into `src/main.ts`.
- **Pseudo-Code**:
    - **`package.json`**:
        - Name: `audio-visualization`
        - Dependencies: `@helios-project/core` pointing to `file:../../packages/core`.
        - DevDependencies: `vite`, `typescript`.
    - **`src/main.ts`**:
        - Import `Helios` from `@helios-project/core`.
        - Re-implement the audio synthesis (Sine sweep + beats) using `AudioContext` from the original `composition.html`.
        - Set up the Canvas context.
        - Initialize `Helios` instance.
        - Call `helios.bindToDocumentTimeline()` (verified pattern from `examples/simple-animation/src/main.ts`).
        - Subscribe to `helios` to trigger the `draw(frame)` function on every update.
    - **`vite.config.ts`**:
        - Standard Vite config with workspace alias support for development (`alias: { '@helios-project/core': ... }`).

## 4. Test Plan
- **Verification**:
    - Run `npm install` in the repository root to link the new example's dependencies.
    - Run `npm run build` inside `examples/audio-visualization` to verify compilation.
    - Run `npx vite preview` inside `examples/audio-visualization` and open the URL to verify the animation plays and audio visuals react.
    - Run `npm run build:examples` from the root to ensure the new example is correctly discovered and built by the global build system.
- **Success Criteria**:
    - The `dist/` directory is generated in the example folder.
    - The global build output contains `audio-visualization`.
    - The animation matches the visual behavior of the original legacy example.
