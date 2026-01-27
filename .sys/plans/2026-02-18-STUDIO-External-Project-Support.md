# Plan: Enable External Project Support in Studio

## 1. Context & Goal
- **Objective**: Update `packages/studio` to fully support "Studio as a Tool" for external projects by ensuring `HELIOS_PROJECT_ROOT` is respected for file serving permissions and render output directories.
- **Trigger**: Vision Gap - `npx helios studio` currently fails for external projects because Vite blocks access to external files and renders are saved to the internal package directory.
- **Impact**: Enables users to run `npx helios studio` in their own project folders (as promised in the README), unlocking the "IDE" capability.

## 2. File Inventory
- **Modify**:
  - `packages/studio/vite.config.ts`: Update `server.fs.allow` to include the project root.
  - `packages/studio/src/server/render-manager.ts`: Update `startRender` to save files to `<PROJECT_ROOT>/renders`.
  - `packages/studio/vite-plugin-studio-api.ts`: Update `/api/renders` middleware to serve files from `<PROJECT_ROOT>/renders` and ensure security checks respect the root.
- **Read-Only**:
  - `packages/studio/src/server/discovery.ts`: To reference `getProjectRoot` logic.

## 3. Implementation Spec
- **Architecture**:
  - The Studio server (Vite) acts as a bridge to the user's local file system.
  - Configuration should always prefer `process.env.HELIOS_PROJECT_ROOT` over `process.cwd()` (which points to the studio package itself).
- **Public API Changes**: None.
- **Pseudo-Code**:
  - **`vite.config.ts`**:
    ```typescript
    const projectRoot = process.env.HELIOS_PROJECT_ROOT
      ? path.resolve(process.env.HELIOS_PROJECT_ROOT)
      : path.resolve(__dirname, '../../');

    // In server.fs:
    allow: [projectRoot, path.resolve(__dirname, '../../')]
    ```
  - **`render-manager.ts`**:
    ```typescript
    // In startRender:
    const projectRoot = process.env.HELIOS_PROJECT_ROOT
      ? path.resolve(process.env.HELIOS_PROJECT_ROOT)
      : process.cwd();
    const rendersDir = path.resolve(projectRoot, 'renders');
    ```
  - **`vite-plugin-studio-api.ts`**:
    ```typescript
    // In /api/renders:
    const projectRoot = process.env.HELIOS_PROJECT_ROOT
      ? path.resolve(process.env.HELIOS_PROJECT_ROOT)
      : process.cwd();
    const rendersDir = path.resolve(projectRoot, 'renders');

    // In /api/assets (DELETE):
    // Ensure security check resolves against projectRoot logic above
    ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. **Run Dev Server**: Execute `npm run dev` in `packages/studio` to ensure the default internal mode still works.
  2. **Code Inspection**: Verify `vite.config.ts` has `server.fs.allow` containing the project root logic.
  3. **Build**: Run `npm run build` in `packages/studio` to verify no type errors.
- **Success Criteria**:
  - `npm run dev` starts successfully.
  - `server.fs.allow` logic is present in `vite.config.ts`.
- **Edge Cases**:
  - `HELIOS_PROJECT_ROOT` is undefined (should fallback to repo root/cwd).
  - `HELIOS_PROJECT_ROOT` is the same as repo root.
