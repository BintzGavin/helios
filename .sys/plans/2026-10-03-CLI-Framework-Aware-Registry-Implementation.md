#### 1. Context & Goal
- **Objective**: Implement framework-based filtering in the CLI Component Registry Client to ensure `helios studio` and `helios add` only expose components relevant to the user's project framework.
- **Trigger**: Vision gap "Framework-agnostic"; current implementation returns all components regardless of project framework, causing potential name collisions and irrelevant UI results in Studio.
- **Impact**: Improves Developer Experience (DX) by hiding irrelevant components and enables the "Component Registry" V2 goal to support multiple frameworks without conflict. Supersedes `2026-10-01-CLI-Framework-Aware-Registry.md` by including `solid` framework support.

#### 2. File Inventory
- **Modify**:
  - `packages/cli/src/registry/client.ts`: Add `framework` filtering to `getComponents` and `findComponent`.
  - `packages/cli/src/commands/studio.ts`: Pass `config.framework` to `getComponents` during initialization.
  - `packages/cli/src/utils/install.ts`: Pass `config.framework` to `findComponent` during installation.
  - `packages/cli/src/registry/types.ts`: Update `ComponentDefinition` type to include `solid`.
- **Read-Only**:
  - `packages/cli/src/utils/config.ts`: Reference `HeliosConfig` interface.

#### 3. Implementation Spec
- **Architecture**: Client-side filtering in `RegistryClient` based on `HeliosConfig` loaded from the project root.
- **Pseudo-Code**:
  - `RegistryClient.getComponents(framework?)`:
    - Fetch/Load registry.
    - If `framework`: `return all.filter(c => c.type === framework)`.
    - Else: `return all`.
  - `RegistryClient.findComponent(name, framework?)`:
    - `list = getComponents(framework)`
    - `return list.find(c => c.name === name)`
  - `studio.ts`:
    - `config = loadConfig()`
    - `comps = getComponents(config?.framework)`
  - `install.ts`:
    - `config = loadConfig()`
    - `comp = findComponent(name, config?.framework)`
- **Public API Changes**:
  - `RegistryClient.getComponents` accepts optional `framework: string`.
  - `RegistryClient.findComponent` accepts optional `framework: string`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `helios studio` in a project with `"framework": "react"` in `helios.config.json` and verify only React components are loaded.
  - Run `helios studio` in a project with `"framework": "vue"` and verify React components are hidden (or Vue components shown).
  - Run `helios add timer` in a React project and verify success.
- **Success Criteria**:
  - `helios studio` logs show filtered component count or UI shows correct items.
  - `helios add` works as expected.
- **Edge Cases**:
  - `helios.config.json` missing -> `framework` is undefined -> Returns all components (Backwards compatibility).
  - Framework is `vanilla` -> Returns `type: 'vanilla'` components.
