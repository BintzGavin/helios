# Plan: Enable External Project Support for Studio

## 1. Context & Goal
- **Objective**: Ensure `npx helios studio` can correctly serve, manage, and render projects located outside the Helios monorepo.
- **Trigger**: The Vision "Launch: `npx helios studio`" fails because the Studio runs in its own directory (`packages/studio`) and Vite blocks access to external files by default. Additionally, rendered files are saved to the Studio package directory instead of the user's project root.
- **Impact**: Unlocks the ability for users to use Helios Studio with their own projects, moving the tool from a "repo-internal prototype" to a "usable developer tool".

## 2. File Inventory
- **Modify**:
  - `packages/studio/vite.config.ts`: Update `server.fs.allow` to include `HELIOS_PROJECT_ROOT`.
  - `packages/studio/src/server/render-manager.ts`: Update to save renders to `HELIOS_PROJECT_ROOT/renders`.
  - `packages/studio/vite-plugin-studio-api.ts`: Update to serve renders from `HELIOS_PROJECT_ROOT/renders`.
- **Read-Only**:
  - `packages/studio/src/server/discovery.ts` (Reuse `getProjectRoot`)
  - `packages/cli/src/commands/studio.ts` (Reference for how CLI invokes Studio)

## 3. Implementation Spec
- **Architecture**:
  - Utilize the existing `HELIOS_PROJECT_ROOT` environment variable (passed by CLI) as the source of truth for the user's project location.
  - Consistently use `getProjectRoot()` (or equivalent logic) across all server-side modules (`vite.config.ts`, `render-manager.ts`, `plugin`) instead of `process.cwd()`.

- **Pseudo-Code**:
  - **`vite.config.ts`**:
    ```typescript
    // Resolve project root from ENV, fallback to repo root
    const projectRoot = process.env.HELIOS_PROJECT_ROOT
      ? path.resolve(process.env.HELIOS_PROJECT_ROOT)
      : path.resolve(__dirname, '../../');

    // Add projectRoot to server.fs.allow configuration
    ```
  - **`render-manager.ts`**:
    ```typescript
    import { getProjectRoot } from './discovery';

    // Inside startRender:
    // Determine project root from process.cwd() (which CLI sets to studio dir) OR env var
    // Note: getProjectRoot handles the ENV var logic
    const projectRoot = getProjectRoot(process.cwd());
    const rendersDir = path.resolve(projectRoot, 'renders');

    // Proceed to create job with this outputPath
    ```
  - **`vite-plugin-studio-api.ts`**:
    ```typescript
    import { getProjectRoot } from './src/server/discovery';

    // Inside /api/renders middleware:
    const projectRoot = getProjectRoot(process.cwd());
    const rendersDir = path.resolve(projectRoot, 'renders');

    // Serve file from this rendersDir
    ```

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Create a temporary external directory `~/tmp/helios-test-project`.
  2. Copy a sample composition (e.g., from `examples/`) to this directory.
  3. Start Studio with `HELIOS_PROJECT_ROOT=~/tmp/helios-test-project npm run dev` (simulating CLI behavior).
  4. Verify:
     - Studio UI loads.
     - Composition is discovered and loads in the player (fixes Vite 403).
     - "Start Render" job saves output to `~/tmp/helios-test-project/renders/`.
     - "Renders Panel" lists the new render.
- **Edge Cases**:
  - `HELIOS_PROJECT_ROOT` not set (should fallback to `examples/` for internal dev).
  - `HELIOS_PROJECT_ROOT` path contains spaces.
