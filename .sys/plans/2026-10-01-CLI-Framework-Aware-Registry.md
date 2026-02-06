# 2026-10-01-CLI-Framework-Aware-Registry.md

#### 1. Context & Goal
- **Objective**: Update the CLI registry client and commands to support multi-framework component discovery and installation.
- **Trigger**: `AGENTS.md` specifies "Shadcn-style component registry" which implies framework-specific source code, and `helios init` supports multiple frameworks (React, Vue, Svelte, etc.), but `helios add` currently ignores the project's framework.
- **Impact**: Enables `helios add` to install the correct component version (e.g., Vue vs React) based on the project configuration, and ensures `helios studio` only lists components compatible with the current project.

#### 2. File Inventory
- **Modify**:
  - `packages/cli/src/registry/client.ts`: Update `getComponents` and `findComponent` to accept a `framework` filter.
  - `packages/cli/src/utils/install.ts`: Pass `framework` to the registry client during installation.
  - `packages/cli/src/commands/add.ts`: Read `framework` from `helios.config.json` and pass it to `installComponent`.
  - `packages/cli/src/commands/studio.ts`: Filter the registry by the project's framework before passing components to the Studio.
  - `packages/cli/src/registry/manifest.ts`: Add a sample Vue component (e.g., `timer` for Vue) to verify the logic locally.

#### 3. Implementation Spec
- **Architecture**:
  - The `RegistryClient` will perform client-side filtering of the registry list based on the requested `framework`.
  - CLI commands (`add`, `studio`) will rely on `loadConfig()` to determine the current project's framework context.
  - If no framework is specified (or for `vanilla`), strict filtering might be relaxed or explicit 'vanilla' type used.
- **Pseudo-Code**:
  - `RegistryClient.getComponents(framework?)`:
    - Fetch all components.
    - If `framework` is provided, `filter(c => c.type === framework)`.
  - `RegistryClient.findComponent(name, framework?)`:
    - `getComponents(framework).find(c => c.name === name)`.
  - `add.ts`:
    - `config = loadConfig()`
    - `installComponent(..., { framework: config.framework })`
  - `studio.ts`:
    - `config = loadConfig()`
    - `components = await defaultClient.getComponents(config.framework)`
    - Pass filtered components to `studioApiPlugin`.
- **Public API Changes**:
  - `RegistryClient` methods signature update (backward compatible with optional arg).
  - `installComponent` signature update.

#### 4. Test Plan
- **Verification**:
  1.  Create a temporary test directory with `helios.config.json` set to `framework: "vue"`.
  2.  Run `helios add timer` (dry-run or actual).
  3.  Verify it attempts to install the Vue version of the timer (added to manifest).
  4.  Change config to `framework: "react"`.
  5.  Run `helios add timer`.
  6.  Verify it installs the React version.
- **Success Criteria**:
  - `RegistryClient` correctly filters components by type.
  - `helios add` respects the `framework` config.
  - `helios studio` (via inspection of logs or code flow) receives filtered components.
