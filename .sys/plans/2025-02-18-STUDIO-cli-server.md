# Plan: Implement Production-Ready CLI Studio Command

## 1. Context & Goal
- **Objective**: Replace the development-only `npm run dev` spawn in the `helios studio` command with a custom Vite server that integrates the Studio UI as a static overlay while serving the user's project with HMR.
- **Trigger**: Vision gap (CLI HMR support) and "Production Surface" backlog item. The current CLI command assumes a monorepo environment and fails in production installs.
- **Impact**: Enables `npx helios studio` to function correctly for end-users, supporting Hot Module Replacement (HMR) for their compositions. This is a critical requirement for V1 release.

## 2. File Inventory
- **Modify**: `packages/studio/package.json` (Add `exports` to expose the CLI plugin and distribution files)
- **Modify**: `packages/cli/package.json` (Add `vite` and `@helios-project/studio` as dependencies)
- **Modify**: `packages/cli/src/commands/studio.ts` (Re-implement command to use `vite.createServer`)
- **Modify**: `packages/cli/tsconfig.json` (Ensure `moduleResolution` supports package exports if needed)

## 3. Implementation Spec
- **Architecture**:
    - The CLI will act as the "Server Host".
    - It will import `studioApiPlugin` from `@helios-project/studio/cli` (a new export).
    - It will locate the built Studio UI assets (`dist/`) within the `@helios-project/studio` package.
    - It will instantiate a Vite server using `createServer` with:
        - `root`: The user's current working directory (project root).
        - `plugins`: `[studioApiPlugin({ studioRoot: ... })]`.
        - `server`: Default port 5173, with auto-increment.

- **Pseudo-Code**:
```typescript
import { createServer } from 'vite';
// Note: This import requires @helios-project/studio to be built and exports configured
import { studioApiPlugin } from '@helios-project/studio/cli';
import { createRequire } from 'module';
import path from 'path';

// 1. Resolve Studio Package Root
const require = createRequire(import.meta.url);
const studioPkgPath = require.resolve('@helios-project/studio/package.json');
const studioRoot = path.dirname(studioPkgPath);
const studioDist = path.join(studioRoot, 'dist');

// 2. Configure and Start Vite Server
const server = await createServer({
  root: process.cwd(), // Serve user's project
  server: {
    port: 5173,
    strictPort: false // Allow auto-increment
  },
  plugins: [
    // 3. Mount Studio API and Static Overlay
    studioApiPlugin({
      studioRoot: studioDist
    })
  ]
});

await server.listen();
server.printUrls();
```

- **Dependencies**:
    - `packages/studio` must be successfully built (`npm run build`) to generate `dist/cli/index.js` and `dist/index.html`.

## 4. Test Plan
- **Verification**:
    1.  **Build Phase**: Run `npm run build -w packages/studio` and `npm run build -w packages/cli`.
    2.  **Setup**: Create a temporary test directory `temp_test_studio` with a basic `composition.html` (e.g., copied from `examples/vanilla-js`).
    3.  **Execution**: Run `node ../packages/cli/bin/helios.js studio` from the test directory.
    4.  **Success Criteria**:
        - Console output shows Vite server running (e.g., `http://localhost:5173`).
        - Opening the URL in a browser loads the Studio UI (served from `packages/studio/dist`).
        - The Studio UI successfully detects and loads the composition from the test directory.
        - Modifying `composition.html` triggers an HMR update (optional but desired).
- **Edge Cases**:
    - **Missing Build**: If `packages/studio/dist` is missing, verify the command fails gracefully or throws a clear error.
