# Studio Component Registry UI

## 1. Context & Goal
- **Objective**: Implement a "Components" panel in the Studio UI that allows users to browse and install components (like Timer) from the Helios Registry.
- **Trigger**: Vision gap. The CLI supports `helios add`, but the Studio UI (the primary developer environment) does not expose this, forcing context switching.
- **Impact**: Improves Agent Experience (AX) and Developer Experience (DX) by making component discovery and installation seamless within the IDE.

## 2. File Inventory
- **Create**:
  - `packages/cli/src/lib.ts`: Library entry point for CLI logic.
  - `packages/cli/src/registry/install.ts`: Reusable installation logic.
  - `packages/cli/src/registry/init.ts`: Reusable initialization logic.
  - `packages/studio/src/components/ComponentsPanel/ComponentsPanel.tsx`: New UI panel.
  - `packages/studio/src/components/ComponentsPanel/ComponentsPanel.css`: Styles.
  - `packages/studio/src/server/components.ts`: Backend service adapter.
- **Modify**:
  - `packages/cli/src/index.ts`: Refactor to use library.
  - `packages/cli/src/commands/add.ts`: Refactor to use library.
  - `packages/cli/src/commands/init.ts`: Refactor to use library.
  - `packages/cli/package.json`: Export library.
  - `packages/studio/package.json`: Add CLI dependency.
  - `packages/studio/src/server/plugin.ts`: Add API endpoints.
  - `packages/studio/src/components/Sidebar/Sidebar.tsx`: Add tab.
- **Read-Only**:
  - `packages/cli/src/registry/manifest.ts`

## 3. Implementation Spec
### Architecture
- **CLI as Library**: Refactor `packages/cli` to export its core logic (registry access, file writing, config loading) as a reusable library (`src/lib.ts`).
- **Studio Backend**: The Studio Vite plugin (`packages/studio/src/server`) will import `@helios-project/cli` and expose REST API endpoints (`/api/components`, `/api/components/install`).
- **Studio Frontend**: React component (`ComponentsPanel`) fetches data from the API and provides "Install" buttons.

### Pseudo-Code
#### CLI Refactor
- Extract `installComponent` from `add.ts`. It should take `rootDir` as argument.
- Extract `initProject` from `init.ts`.
- Export these + `registry`, `loadConfig`, `DEFAULT_CONFIG` in `src/lib.ts`.

#### Studio Backend (`plugin.ts`)
- Register middleware for `/api/components`.
  - GET: Return list from `registry`.
  - POST: Parse body `{ name }`. Call `installComponent(process.cwd(), name)`.
  - **Note**: Vite middleware mounts at path, so `req.url` inside middleware might be `/` or `/install` depending on mounting. Handle carefully.
  - **Note**: `process.cwd()` in the Studio backend (Vite plugin) refers to the user's project root (when running `helios studio`).

#### Studio Frontend (`ComponentsPanel.tsx`)
- Fetch `/api/components` on mount.
- Render list.
- On "Install" click, POST to API.
- Show Success/Error Toast.
- Handle "Project Not Initialized" state by checking `/api/project/config`.

### Public API Changes
- `@helios-project/cli` exports `installComponent`, `initProject`, `registry`, `loadConfig`.
- Studio API adds `/api/components/*` and `/api/project/*`.

## 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/cli`.
  - Run `npx helios studio`.
  - Open "Components" tab.
  - Click "Install" on a component.
  - Verify file creation in the project.
- **Success Criteria**:
  - Components list loads.
  - Installation creates files without error.
  - UI reflects success state.
- **Edge Cases**:
  - Project not initialized (`helios.config.json` missing): UI should prompt to initialize.
  - Component already exists: Backend should handle (skip or overwrite? CLI logic skips).
