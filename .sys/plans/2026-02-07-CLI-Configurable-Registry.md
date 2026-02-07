# 2026-02-07-CLI-Configurable-Registry.md

## 1. Context & Goal
- **Objective**: Enable users to configure the component registry URL via `helios.config.json`.
- **Trigger**: Vision gap - "Helios V2 must be structurally compatible with future monetization" and "Architecture must not preclude paid registries". Currently, the registry URL is hardcoded or dependent on an environment variable, preventing project-level configuration for private/custom registries.
- **Impact**: Allows teams to use private registries or mirrors. Improves architectural maturity by decoupling the CLI from a specific default registry.

## 2. File Inventory
- **Modify**: `packages/cli/src/utils/config.ts` (Add `registry?: string` to `HeliosConfig` interface)
- **Modify**: `packages/cli/src/registry/client.ts` (Refactor `RegistryClient` export to support configuration)
- **Modify**: `packages/cli/src/utils/install.ts` (Update `installComponent` and `resolveComponentTree` to use configured client)
- **Modify**: `packages/cli/src/utils/uninstall.ts` (Update `uninstallComponent` to use configured client)
- **Modify**: `packages/cli/src/commands/components.ts` (Update `components` command to load config and use configured client)
- **Modify**: `packages/cli/src/commands/studio.ts` (Update `studio` command to load config and use configured client)
- **Modify**: `packages/cli/src/commands/update.ts` (Update `update` command to use configured client)

## 3. Implementation Spec
- **Architecture**:
  - Add optional `registry` string to `HeliosConfig`.
  - Refactor `RegistryClient` usage: instead of importing a singleton `defaultClient`, commands will instantiate the client using the URL from the loaded configuration.
  - Commands that operate in a project context (`add`, `studio`, `update`, `components`) will attempt to load `helios.config.json` first. If found and `registry` is defined, it is used; otherwise, it falls back to the default (env var or hardcoded).

- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/utils/config.ts
  export interface HeliosConfig {
    // ... existing fields
    registry?: string;
  }

  // packages/cli/src/registry/client.ts
  export class RegistryClient {
    constructor(url?: string) { ... }
    // ... existing logic
  }
  // Deprecate or remove default export of singleton
  // Or modify it to be reconfigurable, but prefer explicit instantiation.

  // packages/cli/src/utils/install.ts
  export async function installComponent(rootDir: string, componentName: string, ...) {
    const config = loadConfig(rootDir);
    // Instantiate client with config.registry
    const client = new RegistryClient(config?.registry);
    // Pass client to resolveComponentTree
    await resolveComponentTree(componentName, config.framework, visited, client);
    // ...
  }
  ```

- **Public API Changes**:
  - `helios.config.json` now accepts a `registry` property.
  - `RegistryClient` class remains public but `defaultClient` singleton usage is discouraged/removed in favor of explicit instantiation.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1.  Create a dummy `helios.config.json` with a `registry` URL pointing to a non-existent server (e.g., `http://localhost:9999`).
  2.  Run `helios components` and verify it fails or logs a warning about the custom registry (mock or spy, or just log check).
  3.  Verify fallback behavior: remove `registry` from config and ensure it still works with the default registry (e.g., lists standard components).
- **Success Criteria**:
  - `helios components` uses the configured registry URL.
  - `helios add` installs components from the configured registry.
  - No regression for existing default behavior.
- **Edge Cases**:
  - `helios.config.json` exists but no `registry` key -> Fallback to default.
  - `helios.config.json` does not exist -> Fallback to default.
  - Invalid URL in config -> Should error gracefully (handled by `fetch` or `RegistryClient` error handling).
