# 2026-02-11-CLI-Configurable-Registry.md

## 1. Context & Goal
- **Objective**: Enable configuration of the component registry URL via `helios.config.json` and CLI flags (`--registry`), replacing the hardcoded singleton pattern.
- **Trigger**: Vision gap - "Architecture must not preclude paid registries" and "Users own and modify component code". The previous plan (2026-02-07) was not implemented, and this version adds critical CLI flag support for easier testing and CI usage.
- **Impact**: Unlocks support for private registries, local testing, and future paid registries. Decouples the CLI from the default registry, enabling a distributed component economy.

## 2. File Inventory
- **Modify**:
  - `packages/cli/src/utils/config.ts`: Add `registry?: string` to `HeliosConfig`.
  - `packages/cli/src/registry/client.ts`: Refactor `RegistryClient` to support instance-based configuration.
  - `packages/cli/src/utils/install.ts`: Update `installComponent` and `resolveComponentTree` to accept `RegistryClient` instance or URL.
  - `packages/cli/src/commands/add.ts`: Add `--registry <url>` flag.
  - `packages/cli/src/commands/update.ts`: Add `--registry <url>` flag.
  - `packages/cli/src/commands/components.ts`: Add `--registry <url>` flag and support config loading.
- **Read-Only**:
  - `packages/cli/src/registry/manifest.ts`: Local registry fallback.

## 3. Implementation Spec
- **Architecture**:
  - `HeliosConfig` gains an optional `registry` string property.
  - `RegistryClient` is instantiated with a specific URL based on precedence: Flag > Config > Env > Default.
  - `installComponent` acts as the context resolver, determining the correct registry URL before initializing the client and passing it to `resolveComponentTree`.
  - `resolveComponentTree` is updated to accept a `RegistryClient` instance, ensuring recursive dependencies use the same registry.

- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/utils/config.ts
  export interface HeliosConfig {
    // ...
    registry?: string;
  }

  // packages/cli/src/utils/install.ts
  export async function installComponent(rootDir, componentName, options) {
    const config = loadConfig(rootDir);
    // Priority: Flag -> Config -> Env -> Default
    const registryUrl = options.registry || config?.registry || process.env.HELIOS_REGISTRY_URL;
    const client = new RegistryClient(registryUrl);

    // Pass client to resolver
    const components = await resolveComponentTree(componentName, config.framework, client);
    // ... installation logic
  }

  // packages/cli/src/commands/add.ts
  program
    .command('add <component>')
    .option('--registry <url>', 'Custom registry URL')
    .action(async (component, options) => {
      await installComponent(process.cwd(), component, {
        install: options.install,
        registry: options.registry
      });
    });
  ```

- **Public API Changes**:
  - `helios.config.json`: New optional `registry` property.
  - CLI Commands (`add`, `update`, `components`): New `--registry <url>` flag.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1.  **Config Test**: Add `"registry": "http://localhost:9999"` to `helios.config.json` and run `helios components`. Verify it fails/timeouts (attempting to hit custom URL).
  2.  **Flag Test**: Run `helios components --registry http://localhost:9999`. Verify it attempts to hit the custom URL.
  3.  **Priority Test**: Set config to valid URL, run with invalid flag. Verify flag wins (fails).
  4.  **Fallback Test**: Run without config/flag. Verify default registry is used.
- **Success Criteria**:
  - Registry URL is configurable via both config and flag.
  - Recursive dependencies are fetched from the same registry.
- **Edge Cases**:
  - Invalid URL format (should be handled by fetch/client).
  - Registry reachable but returns invalid data.
