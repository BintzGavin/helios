# 2025-02-21-CLI-Configurable-Registry.md

## 1. Context & Goal
- **Objective**: Enable users to configure the component registry URL via `helios.config.json` and refactor CLI commands to respect this configuration.
- **Trigger**: Vision gap - "Helios V2 must be structurally compatible with future monetization" and "Architecture must not preclude paid registries". Currently, the registry URL is hardcoded or dependent on an environment variable (`HELIOS_REGISTRY_URL`), preventing project-level configuration.
- **Impact**: Allows teams to use private registries or mirrors. Improves architectural maturity by decoupling the CLI from a specific default registry.

## 2. File Inventory
- **Modify**: `packages/cli/src/utils/config.ts` (Add `registry?: string` to `HeliosConfig` interface)
- **Modify**: `packages/cli/src/registry/client.ts` (Refactor `RegistryClient` to support instance-based configuration, deprecate/remove singleton usage)
- **Modify**: `packages/cli/src/utils/install.ts` (Update `installComponent` and `resolveComponentTree` to accept a `RegistryClient` instance)
- **Modify**: `packages/cli/src/utils/uninstall.ts` (Update `uninstallComponent` to accept a `RegistryClient` instance for metadata lookup)
- **Modify**: `packages/cli/src/commands/components.ts` (Load config, instantiate client with registry URL)
- **Modify**: `packages/cli/src/commands/studio.ts` (Load config, instantiate client with registry URL)
- **Modify**: `packages/cli/src/commands/add.ts` (Load config, instantiate client, pass to `installComponent`)
- **Modify**: `packages/cli/src/commands/update.ts` (Load config, instantiate client, pass to `installComponent`)
- **Modify**: `packages/cli/src/commands/remove.ts` (Load config, instantiate client, pass to `uninstallComponent`)

## 3. Implementation Spec
- **Architecture**:
  - Extend `HeliosConfig` to include an optional `registry` field (string URL).
  - Modify `RegistryClient` to strictly use the provided URL in its constructor, falling back to `process.env.HELIOS_REGISTRY_URL` only if no URL is provided.
  - Commands (`add`, `studio`, `components`, `update`, `remove`) will be responsible for loading `helios.config.json` (if available), extracting the `registry` URL, and instantiating `RegistryClient`.
  - `installComponent` and `uninstallComponent` will no longer depend on the global `defaultClient` but will accept a client instance as an argument.

- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/utils/config.ts
  export interface HeliosConfig {
    // ...
    registry?: string;
  }

  // packages/cli/src/registry/client.ts
  export class RegistryClient {
    constructor(url?: string) {
       this.url = url || process.env.HELIOS_REGISTRY_URL; // Priority: Config > Env > Default
    }
    // ...
  }
  // Remove defaultClient export

  // packages/cli/src/utils/install.ts
  export async function installComponent(
    rootDir: string,
    componentName: string,
    options: { install: boolean; client: RegistryClient } // New dependency injection
  ) {
     // ... use options.client
  }

  // packages/cli/src/commands/add.ts
  import { loadConfig } from '../utils/config';
  import { RegistryClient } from '../registry/client';

  // Inside action:
  const config = loadConfig(process.cwd());
  const client = new RegistryClient(config?.registry);
  await installComponent(process.cwd(), name, { install: true, client });
  ```

- **Public API Changes**:
  - `helios.config.json` schema change (`registry` field).
  - `installComponent` signature change (requires `client`).
  - `uninstallComponent` signature change (requires `client`).
  - `RegistryClient` behavior change (no longer singleton-first).

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1.  Create a temporary `helios.config.json` in a test directory with `"registry": "http://localhost:9999"`.
  2.  Run `helios components`.
  3.  Expect a connection error or timeout (since localhost:9999 doesn't exist), proving it tried to connect to the custom URL.
  4.  Remove the registry config and run `helios components`.
  5.  Expect it to list components from the default/fallback registry.
- **Success Criteria**:
  - `helios components` fails when pointed to an invalid custom registry.
  - `helios add` uses the configured registry.
  - Existing default behavior remains unchanged when no config is present.
- **Edge Cases**:
  - Config file missing -> Fallback to Env/Default.
  - Config file present but `registry` key missing -> Fallback to Env/Default.
  - `HELIOS_REGISTRY_URL` set AND `config.registry` set -> `config.registry` takes precedence.

## 5. Pre Commit
- Complete pre commit steps to ensure proper testing, verifications, reviews and reflections are done.
