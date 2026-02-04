#### 1. Context & Goal
- **Objective**: Integrate the CLI Component Registry into the Studio UI, enabling users to browse and install components (e.g., Timer, ProgressBar) directly from the browser-based environment.
- **Trigger**: Vision Gap - "Browser-based development environment" requires feature parity with CLI. Backlog item "Create examples demonstrating component usage" is blocked by the lack of visible component discovery in the UI.
- **Impact**: Unlocks a "Drag & Drop" style workflow (or click-to-install) for adding components, significantly improving Agent Experience (AX) and User Experience (UX) by reducing context switching between Studio and Terminal.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/ComponentsPanel/ComponentsPanel.tsx`: New sidebar panel UI for listing and installing components.
  - `packages/studio/src/components/ComponentsPanel/ComponentsPanel.css`: Styles for the new panel.
  - `packages/studio/src/server/registry.ts`: Server-side logic to handle component installation (adapting CLI logic for the API context).
- **Modify**:
  - `packages/studio/vite.config.ts`: Add `alias` to import `@helios-project/cli/registry` from `../cli/src/registry/manifest.ts`.
  - `packages/studio/src/server/plugin.ts`: Register `/api/components` endpoints.
  - `packages/studio/src/context/StudioContext.tsx`: Add state for `components` list and `installComponent` method.
  - `packages/studio/src/components/Sidebar/Sidebar.tsx`: Add "Components" tab to the sidebar navigation.
  - `packages/studio/src/types.ts`: Add `ComponentDefinition` interface (or import strategy).
- **Read-Only**:
  - `packages/cli/src/registry/manifest.ts`: Source of truth for component definitions.
  - `packages/cli/src/utils/config.ts`: Reference implementation for config loading.

#### 3. Implementation Spec
- **Architecture**:
  - **Server-Side**: The Studio Vite plugin (`studioApiPlugin`) will bridge the gap between the static CLI registry and the runtime Studio. It will import the registry manifest via a Vite alias. It will expose REST endpoints to list components and install them.
  - **Installation Logic**: The installation logic must use `getProjectRoot(process.cwd())` to correctly locate `helios.config.json` and the target `components` directory, ensuring it works both in local dev and when used as a tool in external projects.
  - **Client-Side**: The `ComponentsPanel` will consume the `StudioContext` to display the list. Users can click "Add", triggering a POST request to the server to write the files.
- **Pseudo-Code**:
  - **`packages/studio/vite.config.ts`**:
    - Add alias: `'@helios-project/cli-registry': path.resolve(__dirname, '../cli/src/registry/manifest.ts')`.
  - **`packages/studio/src/server/registry.ts`**:
    - `installComponent(projectRoot, componentId)`:
      - `config = loadConfig(projectRoot)` (parses `helios.config.json` or defaults).
      - `component = findComponent(componentId)`.
      - `targetDir = path.join(projectRoot, config.directories.components)`.
      - For each file in component: `fs.writeFileSync(path.join(targetDir, file.name), file.content)`.
  - **`packages/studio/src/server/plugin.ts`**:
    - `GET /api/components`: Return `registry`.
    - `POST /api/components/install`: Parse body `{ id }`, call `installComponent(getProjectRoot(process.cwd()), id)`.
  - **`packages/studio/src/components/ComponentsPanel.tsx`**:
    - Iterate `components` from Context.
    - Render `Card` with Name, Dependencies.
    - Button `onClick={() => installComponent(comp.id)}`.
- **Public API Changes**:
  - `GET /api/components`
  - `POST /api/components/install`
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1.  Run `npx helios studio` (or `npm run dev` in `packages/studio`).
  2.  Open the Studio in the browser.
  3.  Verify a new "Components" tab appears in the Sidebar.
  4.  Verify the list of components (Timer, ProgressBar, Watermark) matches `packages/cli/src/registry/manifest.ts`.
  5.  Click "Add" on "Timer".
  6.  Check the filesystem: Verify `src/components/helios/Timer.tsx` (or configured path) is created.
  7.  Verify a success Toast notification appears.
- **Success Criteria**: Component files are physically created on disk in the correct directory without errors.
- **Edge Cases**:
  - **Missing Config**: If `helios.config.json` is missing, default to `src/components/helios` or return a helpful error.
  - **Overwrite**: If file exists, the server should either overwrite (standard behavior) or skip/warn (robust behavior). For V1, silent overwrite or skip is acceptable if logged.
