# 2026-10-21-DEMO-Standardize-Vue-Dom.md

#### 1. Context & Goal
- **Objective**: Standardize `examples/vue-dom-animation` to use TypeScript, Vite, and a proper `package.json`, matching the "Professional" vision.
- **Trigger**: The current example (`examples/vue-dom-animation`) was scaffolded (via `2025-02-14-DEMO-Vue-Dom.md`) but left in a legacy state (JavaScript, no `package.json`), which violates the "Professional" standard established by `examples/simple-canvas-animation`.
- **Impact**: Ensures Vue users have a high-quality, copy-pasteable reference that works out of the box and aligns with the project's TypeScript-first vision.

#### 2. File Inventory
- **Create**:
  - `examples/vue-dom-animation/package.json`: To define dependencies and scripts.
  - `examples/vue-dom-animation/tsconfig.json`: To enable TypeScript support.
- **Modify**:
  - `examples/vue-dom-animation/vite.config.js` -> `examples/vue-dom-animation/vite.config.ts`: Rename and update to use explicit aliases.
  - `examples/vue-dom-animation/src/main.js` -> `examples/vue-dom-animation/src/main.ts`: Rename and update imports if necessary.
  - `examples/vue-dom-animation/src/App.vue`: Update to use `<script setup lang="ts">`.
  - `examples/vue-dom-animation/composition.html`: Update script source to `./src/main.ts`.
  - `examples/vue-dom-animation/index.html`: Update script source to `./src/main.ts` (if applicable/present).
- **Read-Only**:
  - `examples/simple-canvas-animation/package.json`: Reference for scripts/deps.
  - `examples/simple-canvas-animation/tsconfig.json`: Reference for TS config.

#### 3. Implementation Spec
- **Architecture**:
  - Use Vite for bundling.
  - Use TypeScript for type safety.
  - Use explicit path aliases in `vite.config.ts` to link to local packages (`@helios-project/core`, `@helios-project/player`) for monorepo development, while `package.json` will list them as dependencies for end-users.
- **Pseudo-Code**:
  - **package.json**: Define `name`, `version`, `private: true`, `scripts` (dev, build, preview), and `dependencies` (vue, @helios-project/core, @helios-project/player) and `devDependencies` (vite, @vitejs/plugin-vue, typescript, vue-tsc).
  - **tsconfig.json**: extend base config or use standard Vue TS config (preserveValueImports, isolatedModules, etc.).
  - **vite.config.ts**:
    ```typescript
    import { defineConfig, searchForWorkspaceRoot } from 'vite';
    import vue from '@vitejs/plugin-vue';
    import path from 'path';

    export default defineConfig({
      plugins: [vue()],
      server: {
        fs: { allow: [searchForWorkspaceRoot(path.resolve(__dirname, '../..'))] }
      },
      resolve: {
        alias: {
          '@helios-project/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
          '@helios-project/player': path.resolve(__dirname, '../../packages/player/src/index.ts')
        }
      },
      build: {
        rollupOptions: { input: { main: path.resolve(__dirname, 'composition.html') } }
      }
    });
    ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. `cd examples/vue-dom-animation && npm install`
  2. `npm run build` (inside the directory)
  3. Check that `dist/composition.html` exists.
- **Success Criteria**: The build completes without error, and the output directory contains the compiled assets.
- **Edge Cases**: Ensure `vue-tsc` (if used) doesn't report errors on the converted `App.vue`.
