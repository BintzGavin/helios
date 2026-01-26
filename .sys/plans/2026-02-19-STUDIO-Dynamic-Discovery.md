# 2026-02-19-STUDIO-Dynamic-Discovery.md

#### 1. Context & Goal
- **Objective**: Update Studio's server-side discovery logic to support loading compositions and assets from a configurable project root (via `HELIOS_PROJECT_ROOT`), rather than hardcoding the `examples/` directory.
- **Trigger**: The current implementation hardcodes `../../examples`, making the Studio unusable for actual user projects (Vision Gap: `npx helios studio` should open the user's project).
- **Impact**: Unlocks the ability for the CLI to launch Studio for arbitrary projects. This is a prerequisite for the "Studio as a Tool" vision.

#### 2. File Inventory
- **Modify**:
  - `packages/studio/src/server/discovery.ts`: Update `findCompositions` and `findAssets` to prioritize `process.env.HELIOS_PROJECT_ROOT` if set.
  - `packages/studio/vite.config.ts`: Update `server.fs.allow` to include `HELIOS_PROJECT_ROOT` so Vite can serve external files.
- **Read-Only**:
  - `packages/studio/vite-plugin-studio-api.ts`: To understand how `findCompositions` is called.

#### 3. Implementation Spec
- **Architecture**:
  - The Studio server (running via Vite) will check for `HELIOS_PROJECT_ROOT` environment variable.
  - If set, discovery will scan that directory.
  - If not set (default dev mode), it will fall back to `path.resolve(process.cwd(), '../../examples')`.
  - Vite config will dynamically add the project root to `server.fs.allow` to ensure `/@fs/...` URLs work for external files.

- **Pseudo-Code**:
  - **discovery.ts**:
    ```typescript
    // Add helper
    export function getProjectRoot(cwd: string): string {
      if (process.env.HELIOS_PROJECT_ROOT) {
        return path.resolve(process.env.HELIOS_PROJECT_ROOT);
      }
      return path.resolve(cwd, '../../examples');
    }

    // In findCompositions(rootDir) and findAssets(rootDir):
    // const targetDir = getProjectRoot(rootDir);
    // ... scan targetDir ...
    ```
  - **vite.config.ts**:
    ```typescript
    // In defineConfig:
    // const projectRoot = process.env.HELIOS_PROJECT_ROOT
    //   ? path.resolve(process.env.HELIOS_PROJECT_ROOT)
    //   : path.resolve(__dirname, '../../');

    // server: {
    //   fs: {
    //     allow: [projectRoot] // Add to list or replace
    //   }
    // }
    ```

- **Dependencies**: None. This is a standalone change to `packages/studio`.

#### 4. Test Plan
- **Verification**:
  1. Run standard dev mode: `npm run dev` (in `packages/studio`). Verify it still loads examples (fallback works).
  2. Run with explicit root: `HELIOS_PROJECT_ROOT=../../examples npm run dev`. Verify it loads examples.
  3. (Optional) Run with a dummy path: `HELIOS_PROJECT_ROOT=/tmp/dummy npm run dev`. Verify it scans that path (even if empty, should not crash).
- **Success Criteria**:
  - Studio loads compositions from `HELIOS_PROJECT_ROOT` when provided.
  - Studio falls back to `examples/` when not provided.
  - Vite serves files from the external root without "Access Denied" errors.
- **Edge Cases**:
  - Invalid path in ENV var (Node `fs` might throw, ensure graceful error or empty list).
  - Trailing slashes in paths.
